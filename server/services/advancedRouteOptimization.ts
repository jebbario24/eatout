/**
 * Advanced Route Optimization Service
 * Integrates VRP solver with constraint handling and database tracking
 */

import { db } from '../db';
import {
  orders,
  restaurants,
  deliveryBatches,
  deliveryRoutes,
  routeConstraints,
  routeOptimizationHistory,
  driverCapabilities,
  vehicleTypes,
} from '../../shared/schema';
import { eq, and, inArray, gte, lte } from 'drizzle-orm';
import { vrpSolver } from './vrpSolver';
import type { Stop, Vehicle, VRPSolution, TimeWindow } from './vrpSolver';
import { googleMapsService } from './googleMaps';
import type { LatLng } from './googleMaps';
import logger from '../logger';

export class AdvancedRouteOptimizationService {
  /**
   * Create optimized batch route with constraints
   */
  async createOptimizedBatchRoute(
    driverId: string,
    orderIds: string[],
    driverLocation: LatLng,
    options: {
      optimizeFor?: 'distance' | 'time' | 'priority';
      respectConstraints?: boolean;
      maxComputeTime?: number;
    } = {}
  ): Promise<{
    batchId: string;
    route: VRPSolution;
    constraintsViolated: string[];
  }> {
    const startTime = Date.now();
    const {
      optimizeFor = 'time',
      respectConstraints = true,
      maxComputeTime = 5000,
    } = options;

    try {
      // Step 1: Get driver capabilities
      const vehicle = await this.getDriverVehicle(driverId, driverLocation);

      // Step 2: Build stops from orders
      const stops = await this.buildStopsFromOrders(orderIds, respectConstraints);

      // Step 3: Solve VRP
      const solution = await vrpSolver.solve(stops, vehicle, {
        optimizeFor,
        allowViolations: !respectConstraints,
        maxComputeTime,
      });

      // Step 4: Create batch in database
      const [batch] = await db.insert(deliveryBatches).values({
        driverId,
        orderIds,
        orderCount: orderIds.length,
        stopSequence: solution.route.map(s => ({
          stopId: s.id,
          type: s.type,
          orderId: s.orderId,
        })),
        totalDistanceMeters: Math.round(solution.totalDistance),
        totalDurationSeconds: Math.round(solution.totalDuration),
        batchStatus: 'planned',
        estimatedEarnings: (await this.calculateEstimatedEarnings(orderIds)).toString(),
      }).returning();

      // Step 5: Create routes for each order
      await this.createRoutesForOrders(
        orderIds,
        driverId,
        batch.id,
        solution,
        driverLocation
      );

      // Step 6: Log optimization history
      await this.logOptimizationHistory({
        batchId: batch.id,
        driverId,
        inputOrders: orderIds,
        algorithm: 'vrp_solver',
        outputSequence: solution.route.map(s => ({
          stopId: s.id,
          orderId: s.orderId,
          type: s.type,
        })),
        computeTimeMs: Date.now() - startTime,
        savingsPercentage: null, // Calculate vs individual routes
        optimizationScore: solution.score,
        constraintsSatisfied: solution.constraintsSatisfied,
        constraintsViolated: solution.violations,
      });

      logger.info('Advanced batch route created', {
        batchId: batch.id,
        driverId,
        orderCount: orderIds.length,
        distance: solution.totalDistance,
        duration: solution.totalDuration,
        score: solution.score,
        violations: solution.violations.length,
      });

      return {
        batchId: batch.id,
        route: solution,
        constraintsViolated: solution.violations,
      };
    } catch (error) {
      logger.error('Failed to create advanced batch route', { error, driverId, orderIds });
      throw error;
    }
  }

  /**
   * Get driver vehicle capabilities
   */
  private async getDriverVehicle(
    driverId: string,
    currentLocation: LatLng
  ): Promise<Vehicle> {
    // Try to get driver capabilities
    const [capabilities] = await db
      .select()
      .from(driverCapabilities)
      .where(eq(driverCapabilities.driverId, driverId))
      .limit(1);

    let vehicleInfo = null;
    if (capabilities?.vehicleTypeId) {
      [vehicleInfo] = await db
        .select()
        .from(vehicleTypes)
        .where(eq(vehicleTypes.id, capabilities.vehicleTypeId))
        .limit(1);
    }

    // Default values if no capabilities set
    const maxOrders = capabilities?.maxOrders || vehicleInfo?.maxOrders || 4;
    const maxWeight = parseFloat(capabilities?.maxWeight || vehicleInfo?.maxWeight || '20');
    const hasColdStorage = capabilities?.hasColdStorage || vehicleInfo?.hasColdStorage || false;
    const hasHotStorage = capabilities?.hasHotStorage || vehicleInfo?.hasHotStorage || true;
    const avgSpeed = vehicleInfo?.avgSpeed || 30; // km/h

    return {
      id: `driver_${driverId}`,
      driverId,
      currentLocation,
      capacity: {
        maxOrders,
        maxWeight,
        hasColdStorage,
        hasHotStorage,
      },
      speed: avgSpeed,
      availableAt: new Date(),
    };
  }

  /**
   * Build stops from orders with constraints
   */
  private async buildStopsFromOrders(
    orderIds: string[],
    includeConstraints: boolean
  ): Promise<Stop[]> {
    const stops: Stop[] = [];

    // Get orders
    const orderList = await db
      .select()
      .from(orders)
      .where(inArray(orders.id, orderIds));

    // Get restaurant coordinates/addresses for pickup stops (API delivery jobs use their own pickup fields instead)
    const restaurantIds = Array.from(new Set(orderList.map(o => o.restaurantId).filter((id): id is string => !!id)));
    const restaurantRows = restaurantIds.length > 0
      ? await db.select({ id: restaurants.id, address: restaurants.address, latitude: restaurants.latitude, longitude: restaurants.longitude })
          .from(restaurants)
          .where(inArray(restaurants.id, restaurantIds))
      : [];
    const restaurantById = new Map(restaurantRows.map(r => [r.id, r]));

    // Get constraints if needed
    let constraints: any[] = [];
    if (includeConstraints) {
      constraints = await db
        .select()
        .from(routeConstraints)
        .where(inArray(routeConstraints.orderId, orderIds));
    }

    const constraintsByOrder = new Map<string, any[]>();
    constraints.forEach(c => {
      const orderId = c.orderId;
      if (!constraintsByOrder.has(orderId)) {
        constraintsByOrder.set(orderId, []);
      }
      constraintsByOrder.get(orderId)!.push(c);
    });

    for (const order of orderList) {
      const orderId = order.id;
      const orderConstraints = constraintsByOrder.get(orderId) || [];

      // Find time window constraints
      let timeWindow: TimeWindow | undefined;
      for (const constraint of orderConstraints) {
        if (constraint.earliestTime && constraint.latestTime) {
          timeWindow = {
            earliest: new Date(constraint.earliestTime),
            latest: new Date(constraint.latestTime),
          };
          break;
        }
      }

      const restaurant = order.restaurantId ? restaurantById.get(order.restaurantId) : undefined;

      // Create pickup stop (restaurant, or the order's own pickup fields for an API delivery job)
      stops.push({
        id: `pickup_${order.id}`,
        type: 'pickup',
        location: {
          lat: parseFloat(restaurant?.latitude || order.pickupLat || '0'),
          lng: parseFloat(restaurant?.longitude || order.pickupLng || '0'),
        },
        address: restaurant?.address || order.pickupAddress || '',
        orderId,
        restaurantId: order.restaurantId || undefined,
        timeWindow,
        priority: orderConstraints.find(c => c.priority)?.priority || 5,
        estimatedServiceTime: 3, // minutes to pickup
        weight: 0, // Set based on order items if available
      });

      // Create dropoff stop
      stops.push({
        id: `dropoff_${order.id}`,
        type: 'dropoff',
        location: {
          lat: parseFloat(order.deliveryLat || '0'),
          lng: parseFloat(order.deliveryLng || '0'),
        },
        address: order.deliveryAddress || '',
        orderId,
        timeWindow,
        priority: orderConstraints.find(c => c.priority)?.priority || 5,
        estimatedServiceTime: 2, // minutes to deliver
        weight: 0,
      });
    }

    return stops;
  }

  /**
   * Create routes for each order in the batch
   */
  private async createRoutesForOrders(
    orderIds: string[],
    driverId: string,
    batchId: string,
    solution: VRPSolution,
    driverLocation: LatLng
  ): Promise<void> {
    // Get full route with Google Maps polyline
    const waypoints = solution.route.map(stop => stop.location);

    if (waypoints.length === 0) return;

    const lastStop = waypoints[waypoints.length - 1];
    const waypointsExceptLast = waypoints.slice(0, -1);

    const fullRoute = await googleMapsService.calculateRoute(
      driverLocation,
      lastStop,
      {
        waypoints: waypointsExceptLast,
        departureTime: new Date(),
      }
    );

    // Create a route for each order
    for (const orderId of orderIds) {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) continue;

      const pickupStop = solution.arrivalTimes.find(a => a.stopId === `pickup_${orderId}`);
      const dropoffStop = solution.arrivalTimes.find(a => a.stopId === `dropoff_${orderId}`);

      await db.insert(deliveryRoutes).values({
        orderId,
        driverId,
        batchId,
        originLat: driverLocation.lat.toString(),
        originLng: driverLocation.lng.toString(),
        destinationLat: order.deliveryLat || '0',
        destinationLng: order.deliveryLng || '0',
        distanceMeters: Math.round(solution.totalDistance / orderIds.length), // Approximate
        durationSeconds: Math.round(solution.totalDuration / orderIds.length), // Approximate
        durationInTrafficSeconds: Math.round(solution.totalDuration / orderIds.length),
        polyline: fullRoute.routes[0]?.polyline || '',
        steps: fullRoute.routes[0]?.steps || [],
        optimizationScore: solution.score.toString(),
        estimatedPickupTime: pickupStop?.arrivalTime,
        estimatedDeliveryTime: dropoffStop?.arrivalTime,
        routeStatus: 'planned',
      });
    }
  }

  /**
   * Calculate estimated earnings for orders
   */
  private async calculateEstimatedEarnings(orderIds: string[]): Promise<number> {
    const orderList = await db
      .select()
      .from(orders)
      .where(inArray(orders.id, orderIds));

    return orderList.reduce((sum, order) => sum + parseFloat(order.deliveryFee || '0'), 0);
  }

  /**
   * Log optimization history for analysis
   */
  private async logOptimizationHistory(data: {
    batchId: string;
    driverId: string;
    inputOrders: string[];
    algorithm: string;
    outputSequence: any;
    computeTimeMs: number;
    savingsPercentage: number | null;
    optimizationScore: number;
    constraintsSatisfied: boolean;
    constraintsViolated: string[];
  }): Promise<void> {
    await db.insert(routeOptimizationHistory).values({
      batchId: data.batchId,
      driverId: data.driverId,
      inputOrders: data.inputOrders,
      algorithm: data.algorithm,
      algorithmVersion: '1.0',
      inputSequence: null,
      outputSequence: data.outputSequence,
      computeTimeMs: data.computeTimeMs,
      savingsPercentage: data.savingsPercentage?.toString() || null,
      optimizationScore: data.optimizationScore,
      constraintsSatisfied: data.constraintsSatisfied,
      constraintsViolated: data.constraintsViolated,
    });
  }

  /**
   * Add time window constraint to an order
   */
  async addTimeWindowConstraint(
    orderId: string,
    earliestTime: Date,
    latestTime: Date,
    options: {
      constraintType?: string;
      priority?: number;
      isHard?: boolean;
      reason?: string;
    } = {}
  ): Promise<string> {
    const {
      constraintType = 'customer_window',
      priority = 5,
      isHard = true,
      reason,
    } = options;

    const [constraint] = await db.insert(routeConstraints).values({
      orderId,
      constraintType,
      earliestTime,
      latestTime,
      priority,
      isHard,
      reason,
    }).returning();

    logger.info('Time window constraint added', {
      orderId,
      constraintType,
      earliestTime,
      latestTime,
    });

    return constraint.id;
  }

  /**
   * Get constraints for an order
   */
  async getOrderConstraints(orderId: string): Promise<any[]> {
    return await db
      .select()
      .from(routeConstraints)
      .where(eq(routeConstraints.orderId, orderId));
  }

  /**
   * Remove constraint
   */
  async removeConstraint(constraintId: string): Promise<void> {
    await db
      .delete(routeConstraints)
      .where(eq(routeConstraints.id, constraintId));

    logger.info('Constraint removed', { constraintId });
  }
}

// Export singleton
export const advancedRouteOptimizationService = new AdvancedRouteOptimizationService();
