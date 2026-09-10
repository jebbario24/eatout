import { db } from '../db';
import { deliveryRoutes, orders, deliveryBatches, restaurants } from '../../shared/schema';
import { eq, inArray } from 'drizzle-orm';
import { googleMapsService } from './googleMaps';
import type { LatLng } from './googleMaps';
import logger from '../logger';

interface DeliveryStop {
  orderId: string;
  location: LatLng;
  address: string;
  type: 'pickup' | 'dropoff';
  restaurantId?: string;
}

interface OptimizedRoute {
  stops: DeliveryStop[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  polyline: string;
  optimizationScore: number; // 0-100, higher is better
  estimatedEarnings: number;
  savingsVsIndividual: {
    distanceMeters: number;
    durationSeconds: number;
    percentage: number;
  };
}

class RouteOptimizationService {
  /**
   * Optimize route for a single delivery
   * Creates a route from driver -> restaurant -> customer
   */
  async createSingleDeliveryRoute(
    driverId: string,
    orderId: string,
    driverLocation: LatLng
  ): Promise<string> {
    try {
      // Get order details
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        throw new Error('Order not found');
      }

      // Pickup location: restaurant (storefront order) or the order's own pickup fields (API delivery job)
      let pickupLat = order.pickupLat;
      let pickupLng = order.pickupLng;
      if (order.restaurantId) {
        const [restaurant] = await db
          .select({ latitude: restaurants.latitude, longitude: restaurants.longitude })
          .from(restaurants)
          .where(eq(restaurants.id, order.restaurantId))
          .limit(1);
        pickupLat = restaurant?.latitude;
        pickupLng = restaurant?.longitude;
      }

      const restaurantLocation: LatLng = {
        lat: parseFloat(pickupLat || '0'),
        lng: parseFloat(pickupLng || '0'),
      };

      const customerLocation: LatLng = {
        lat: parseFloat(order.deliveryLat || '0'),
        lng: parseFloat(order.deliveryLng || '0'),
      };

      // Calculate route: Driver -> Restaurant -> Customer
      const route = await googleMapsService.calculateRoute(
        driverLocation,
        customerLocation,
        {
          waypoints: [restaurantLocation],
          departureTime: new Date(),
        }
      );

      if (!route.routes || route.routes.length === 0) {
        throw new Error('No route found');
      }

      const bestRoute = route.routes[0];
      const now = new Date();

      // Calculate estimated times
      const estimatedPickupTime = new Date(now.getTime() + (bestRoute.durationSeconds / 2) * 1000);
      const estimatedDeliveryTime = new Date(now.getTime() + bestRoute.durationInTrafficSeconds! * 1000);

      // Store route in database
      const [savedRoute] = await db.insert(deliveryRoutes).values({
        orderId,
        driverId,
        originLat: driverLocation.lat.toString(),
        originLng: driverLocation.lng.toString(),
        destinationLat: customerLocation.lat.toString(),
        destinationLng: customerLocation.lng.toString(),
        distanceMeters: bestRoute.distanceMeters,
        durationSeconds: bestRoute.durationSeconds,
        durationInTrafficSeconds: bestRoute.durationInTrafficSeconds || bestRoute.durationSeconds,
        polyline: bestRoute.polyline,
        steps: bestRoute.steps,
        optimizationScore: '100', // Single route = 100% optimal
        estimatedPickupTime,
        estimatedDeliveryTime,
        routeStatus: 'active',
      }).returning();

      // Update order with estimated times
      await db
        .update(orders)
        .set({
          estimatedPickupTime,
          estimatedDeliveryTime,
        })
        .where(eq(orders.id, orderId));

      logger.info(`Single delivery route created for order ${orderId}`, {
        distanceMeters: bestRoute.distanceMeters,
        durationSeconds: bestRoute.durationSeconds,
      });

      return savedRoute.id;
    } catch (error) {
      logger.error('Failed to create single delivery route', { error, orderId });
      throw error;
    }
  }

  /**
   * Optimize route for batch delivery (multiple orders)
   * Uses TSP (Traveling Salesperson Problem) solver to find optimal order
   */
  async createBatchDeliveryRoute(
    driverId: string,
    orderIds: string[],
    driverLocation: LatLng
  ): Promise<OptimizedRoute> {
    try {
      if (orderIds.length === 0) {
        throw new Error('No orders provided for batch');
      }

      // Get all orders
      const orderList = await db
        .select()
        .from(orders)
        .where(inArray(orders.id, orderIds));

      if (orderList.length !== orderIds.length) {
        throw new Error('Some orders not found');
      }

      // Fetch restaurant coordinates/addresses for all restaurants involved (some orders may be
      // API delivery jobs with no restaurant, using their own pickup fields instead)
      const restaurantIds = Array.from(new Set(orderList.map(o => o.restaurantId).filter((id): id is string => !!id)));
      const restaurantRows = restaurantIds.length > 0
        ? await db
            .select({ id: restaurants.id, address: restaurants.address, latitude: restaurants.latitude, longitude: restaurants.longitude })
            .from(restaurants)
            .where(inArray(restaurants.id, restaurantIds))
        : [];
      const restaurantById = new Map(restaurantRows.map(r => [r.id, r]));

      // Build stops: pickup and dropoff for each order
      const stops: DeliveryStop[] = [];
      const restaurantMap = new Map<string, DeliveryStop>();

      for (const order of orderList) {
        // Pickup key: restaurant ID (shared across orders from the same restaurant), or
        // this order's own ID for API delivery jobs (each has its own distinct pickup point)
        const pickupKey = order.restaurantId || order.id;
        const restaurant = order.restaurantId ? restaurantById.get(order.restaurantId) : undefined;
        const restaurantLocation: LatLng = {
          lat: parseFloat(restaurant?.latitude || order.pickupLat || '0'),
          lng: parseFloat(restaurant?.longitude || order.pickupLng || '0'),
        };

        // Add pickup stop (or reuse if same restaurant)
        if (!restaurantMap.has(pickupKey)) {
          const pickupStop: DeliveryStop = {
            orderId: order.id,
            location: restaurantLocation,
            address: restaurant?.address || order.pickupAddress || '',
            type: 'pickup',
            restaurantId: order.restaurantId || undefined,
          };
          stops.push(pickupStop);
          restaurantMap.set(pickupKey, pickupStop);
        }

        // Add dropoff stop
        stops.push({
          orderId: order.id,
          location: {
            lat: parseFloat(order.deliveryLat || '0'),
            lng: parseFloat(order.deliveryLng || '0'),
          },
          address: order.deliveryAddress || '',
          type: 'dropoff',
        });
      }

      // Optimize route order using Google Maps
      const waypoints = stops.map(s => s.location);
      const lastStop = waypoints.pop()!; // Last stop is destination

      const optimized = await googleMapsService.optimizeWaypoints(
        driverLocation,
        waypoints,
        lastStop
      );

      // Calculate optimization savings vs individual deliveries
      const individualRoutes = await Promise.all(
        orderList.map(order =>
          googleMapsService.calculateRoute(
            driverLocation,
            {
              lat: parseFloat(order.deliveryLat || '0'),
              lng: parseFloat(order.deliveryLng || '0'),
            }
          )
        )
      );

      const totalIndividualDistance = individualRoutes.reduce(
        (sum, route) => sum + (route.routes[0]?.distanceMeters || 0),
        0
      );
      const totalIndividualDuration = individualRoutes.reduce(
        (sum, route) => sum + (route.routes[0]?.durationSeconds || 0),
        0
      );

      const distanceSavings = totalIndividualDistance - optimized.totalDistanceMeters;
      const durationSavings = totalIndividualDuration - optimized.totalDurationSeconds;
      const savingsPercentage = (distanceSavings / totalIndividualDistance) * 100;

      // Calculate optimization score (higher savings = higher score)
      const optimizationScore = Math.min(100, Math.round(50 + savingsPercentage));

      // Estimate earnings (placeholder - should come from pricing logic)
      const estimatedEarnings = orderList.reduce(
        (sum, order) => sum + parseFloat(order.deliveryFee || '0'),
        0
      );

      // Create batch record
      const [batch] = await db.insert(deliveryBatches).values({
        driverId,
        orderIds,
        orderCount: orderIds.length,
        stopSequence: optimized.optimizedOrder,
        totalDistanceMeters: optimized.totalDistanceMeters,
        totalDurationSeconds: optimized.totalDurationSeconds,
        estimatedEarnings: estimatedEarnings.toString(),
        routeOptimizationSavings: distanceSavings.toString(),
        timeOptimizationSavings: durationSavings,
        batchStatus: 'active',
      }).returning();

      // Get the full optimized route with polyline
      const fullRoute = await googleMapsService.calculateRoute(
        driverLocation,
        lastStop,
        {
          waypoints,
          departureTime: new Date(),
        }
      );

      logger.info(`Batch delivery route created for driver ${driverId}`, {
        orderCount: orderIds.length,
        distanceSavings,
        optimizationScore,
      });

      return {
        stops: optimized.optimizedOrder.map(idx => stops[idx]),
        totalDistanceMeters: optimized.totalDistanceMeters,
        totalDurationSeconds: optimized.totalDurationSeconds,
        polyline: fullRoute.routes[0]?.polyline || '',
        optimizationScore,
        estimatedEarnings,
        savingsVsIndividual: {
          distanceMeters: distanceSavings,
          durationSeconds: durationSavings,
          percentage: savingsPercentage,
        },
      };
    } catch (error) {
      logger.error('Failed to create batch delivery route', { error, orderIds });
      throw error;
    }
  }

  /**
   * Find best orders for batch delivery
   * Groups orders by proximity and restaurant
   */
  async findBatchOpportunities(
    driverId: string,
    driverLocation: LatLng,
    maxOrders: number = 4,
    maxDistanceMeters: number = 5000
  ): Promise<string[][]> {
    try {
      // Get available orders near driver
      const availableOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.status, 'ready_for_pickup'));

      // Group orders by pickup point: restaurant ID, or each API delivery job's own order ID
      // (each API job is its own distinct pickup point unless it shares a restaurant)
      const restaurantGroups = new Map<string, typeof availableOrders>();
      for (const order of availableOrders) {
        const groupKey = order.restaurantId || order.id;
        if (!restaurantGroups.has(groupKey)) {
          restaurantGroups.set(groupKey, []);
        }
        restaurantGroups.get(groupKey)!.push(order);
      }

      // Find batch opportunities
      const opportunities: string[][] = [];

      for (const [restaurantId, orderGroup] of restaurantGroups.entries()) {
        if (orderGroup.length < 2) continue; // Need at least 2 orders for a batch

        // Check if orders are close to each other
        const ordersInRange: string[] = [];

        for (let i = 0; i < orderGroup.length && ordersInRange.length < maxOrders; i++) {
          const order = orderGroup[i];
          const orderLocation: LatLng = {
            lat: parseFloat(order.deliveryLat || '0'),
            lng: parseFloat(order.deliveryLng || '0'),
          };

          // Check distance from driver
          const distanceFromDriver = await this.calculateDistance(driverLocation, orderLocation);
          if (distanceFromDriver > maxDistanceMeters) continue;

          // Check if dropoff locations are close to each other
          let tooFar = false;
          for (const existingOrderId of ordersInRange) {
            const existingOrder = orderGroup.find(o => o.id === existingOrderId)!;
            const existingLocation: LatLng = {
              lat: parseFloat(existingOrder.deliveryLat || '0'),
              lng: parseFloat(existingOrder.deliveryLng || '0'),
            };

            const distanceBetweenDropoffs = await this.calculateDistance(orderLocation, existingLocation);
            if (distanceBetweenDropoffs > maxDistanceMeters) {
              tooFar = true;
              break;
            }
          }

          if (!tooFar) {
            ordersInRange.push(order.id);
          }
        }

        if (ordersInRange.length >= 2) {
          opportunities.push(ordersInRange);
        }
      }

      logger.info(`Found ${opportunities.length} batch opportunities for driver ${driverId}`);
      return opportunities;
    } catch (error) {
      logger.error('Failed to find batch opportunities', { error, driverId });
      return [];
    }
  }

  /**
   * Helper: Calculate distance between two points using Google Maps
   */
  private async calculateDistance(point1: LatLng, point2: LatLng): Promise<number> {
    try {
      const result = await googleMapsService.calculateDistanceMatrix([point1], [point2]);
      return result.rows[0].elements[0].distance.value;
    } catch (error) {
      // Fallback to Haversine formula
      const R = 6371e3;
      const φ1 = (point1.lat * Math.PI) / 180;
      const φ2 = (point2.lat * Math.PI) / 180;
      const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
      const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    }
  }
}

// Export singleton instance
export const routeOptimizationService = new RouteOptimizationService();
export type { DeliveryStop, OptimizedRoute };
