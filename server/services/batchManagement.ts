/**
 * Batch Management Service
 * 
 * Handles creating, modifying, and managing batch deliveries:
 * - Create batches from compatible orders
 * - Dynamic reordering of stops
 * - Adding/removing orders mid-batch
 * - Splitting batches
 * - Performance tracking
 */

import { db } from '../db';
import {
  deliveryBatches,
  batchStops,
  batchModifications,
  batchPerformance,
  orders,
  restaurants,
} from '../../shared/schema';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import logger from '../logger';
import { batchCompatibilityService } from './batchCompatibility';
import { vrpSolver } from './vrpSolver';
import type { Stop as VRPStop, Vehicle as VRPVehicle } from './vrpSolver';
import { locationTrackingService } from './locationTracking';

interface BatchOrder {
  orderId: string;
  restaurantId?: string; // absent for API delivery jobs
  restaurantLat: number;
  restaurantLng: number;
  restaurantAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryAddress: string;
  customerName: string;
  customerPhone: string;
  deliveryInstructions?: string;
  orderValue: number;
}

interface Stop {
  stopType: 'pickup' | 'dropoff';
  orderId: string;
  lat: number;
  lng: number;
  address: string;
  contactName: string;
  contactPhone: string;
  instructions?: string;
  estimatedArrivalTime?: Date;
}

export class BatchManagementService {
  /**
   * Create a new batch from multiple orders
   */
  async createBatch(
    driverId: string,
    orderIds: string[],
    optimizeRoute: boolean = true
  ): Promise<{ batchId: string; stops: any[] }> {
    try {
      if (orderIds.length < 2) {
        throw new Error('Batch must contain at least 2 orders');
      }

      // Check compatibility between all orders
      for (let i = 0; i < orderIds.length; i++) {
        for (let j = i + 1; j < orderIds.length; j++) {
          const compat = await batchCompatibilityService.checkCompatibility(
            orderIds[i],
            orderIds[j]
          );
          if (!compat.isCompatible) {
            throw new Error(
              `Orders ${orderIds[i]} and ${orderIds[j]} are not compatible: ${compat.incompatibilityReasons.join(', ')}`
            );
          }
        }
      }

      // Get order details
      const batchOrders = await this.getOrderDetails(orderIds);

      // Optimize route if requested
      let stopSequence: Stop[];
      let routeInfo: any = {};

      if (optimizeRoute) {
        const driverLocation = await locationTrackingService.getCurrentLocation(driverId);
        if (driverLocation) {
          const vrpStops = this.buildVRPStops(batchOrders);
          const vehicle: VRPVehicle = {
            id: `driver_${driverId}`,
            driverId,
            currentLocation: driverLocation,
            capacity: { maxOrders: 4, maxWeight: 20, hasColdStorage: false, hasHotStorage: true },
            speed: 30,
            availableAt: new Date(),
          };
          const solution = await vrpSolver.solve(vrpStops, vehicle, { optimizeFor: 'time' });
          stopSequence = this.convertToStops(solution.route, batchOrders);
          routeInfo = {
            totalDistanceMeters: Math.round(solution.totalDistance),
            totalDurationSeconds: Math.round(solution.totalDuration),
            estimatedEarnings: this.calculateEstimatedEarnings(batchOrders),
          };
        } else {
          stopSequence = this.createSimpleSequence(batchOrders);
          routeInfo = await this.estimateRouteInfo(stopSequence);
        }
      } else {
        // Simple sequence: all pickups first, then all dropoffs
        stopSequence = this.createSimpleSequence(batchOrders);
        routeInfo = await this.estimateRouteInfo(stopSequence);
      }

      // Create batch record
      const [batch] = await db.insert(deliveryBatches).values({
        driverId,
        orderIds,
        orderCount: orderIds.length,
        stopSequence: stopSequence as any,
        totalDistanceMeters: routeInfo.totalDistanceMeters,
        totalDurationSeconds: routeInfo.totalDurationSeconds,
        estimatedEarnings: routeInfo.estimatedEarnings?.toFixed(2),
        batchStatus: 'pending',
      }).returning();

      // Create batch stops
      const stops = await this.createBatchStops(batch.id, stopSequence);

      // Update orders to reference batch
      await db.update(orders)
        .set({ batchId: batch.id })
        .where(inArray(orders.id, orderIds));

      logger.info(`Created batch ${batch.id} with ${orderIds.length} orders, ${stops.length} stops`);

      return { batchId: batch.id, stops };
    } catch (error) {
      logger.error('Error creating batch:', error);
      throw error;
    }
  }

  /**
   * Start a batch (driver begins first stop)
   */
  async startBatch(batchId: string): Promise<void> {
    await db.update(deliveryBatches)
      .set({
        batchStatus: 'active',
        startedAt: new Date(),
      })
      .where(eq(deliveryBatches.id, batchId));

    logger.info(`Batch ${batchId} started`);
  }

  /**
   * Complete a stop in a batch
   */
  async completeStop(
    batchId: string,
    stopId: string,
    actualArrivalTime: Date,
    duration: number,
    hasIssues: boolean = false,
    issueDescription?: string
  ): Promise<void> {
    await db.update(batchStops)
      .set({
        status: 'completed',
        actualArrivalTime,
        actualDuration: duration,
        hasIssues,
        issueDescription,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(batchStops.id, stopId));

    // Check if all stops are completed
    const allStops = await db.select()
      .from(batchStops)
      .where(eq(batchStops.batchId, batchId));

    const allCompleted = allStops.every(stop => stop.status === 'completed' || stop.status === 'skipped');

    if (allCompleted) {
      await this.completeBatch(batchId);
    }

    logger.info(`Stop ${stopId} completed in batch ${batchId}`);
  }

  /**
   * Complete entire batch
   */
  async completeBatch(batchId: string): Promise<void> {
    await db.update(deliveryBatches)
      .set({
        batchStatus: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deliveryBatches.id, batchId));

    // Calculate and save performance metrics
    await this.calculateBatchPerformance(batchId);

    logger.info(`Batch ${batchId} completed`);
  }

  /**
   * Reorder stops in a batch
   */
  async reorderStops(
    batchId: string,
    driverId: string,
    newSequence: string[], // Array of stop IDs in new order
    reason: string
  ): Promise<{ success: boolean; newStops: any[] }> {
    try {
      // Get current stops
      const currentStops = await db.select()
        .from(batchStops)
        .where(eq(batchStops.batchId, batchId))
        .orderBy(batchStops.stopNumber);

      // Save before state
      const beforeState = currentStops.map(s => ({
        id: s.id,
        stopNumber: s.stopNumber,
        stopType: s.stopType,
        orderId: s.orderId,
      }));

      // Update stop numbers
      for (let i = 0; i < newSequence.length; i++) {
        await db.update(batchStops)
          .set({ stopNumber: i + 1, updatedAt: new Date() })
          .where(eq(batchStops.id, newSequence[i]));
      }

      // Get updated stops
      const updatedStops = await db.select()
        .from(batchStops)
        .where(eq(batchStops.batchId, batchId))
        .orderBy(batchStops.stopNumber);

      // Save after state
      const afterState = updatedStops.map(s => ({
        id: s.id,
        stopNumber: s.stopNumber,
        stopType: s.stopType,
        orderId: s.orderId,
      }));

      // Calculate impact (would need distance/time recalculation)
      // For now, just record the change

      // Record modification
      await db.insert(batchModifications).values({
        batchId,
        driverId,
        modificationType: 'reorder',
        reason,
        beforeState: beforeState as any,
        afterState: afterState as any,
        affectedOrderIds: currentStops.map(s => s.orderId),
      });

      logger.info(`Reordered stops in batch ${batchId}`);

      return { success: true, newStops: updatedStops };
    } catch (error) {
      logger.error('Error reordering stops:', error);
      throw error;
    }
  }

  /**
   * Add an order to an existing batch
   */
  async addOrderToBatch(
    batchId: string,
    driverId: string,
    orderId: string,
    insertPosition?: number
  ): Promise<void> {
    try {
      // Get batch info
      const batch = await db.select()
        .from(deliveryBatches)
        .where(eq(deliveryBatches.id, batchId))
        .limit(1);

      if (!batch[0]) {
        throw new Error('Batch not found');
      }

      const currentOrderIds = batch[0].orderIds || [];

      // Check compatibility with all existing orders
      const compatibleWith = await batchCompatibilityService.findCompatibleOrders(
        orderId,
        currentOrderIds
      );

      if (compatibleWith.length !== currentOrderIds.length) {
        throw new Error('Order is not compatible with all orders in the batch');
      }

      // Check capacity
      const capacityCheck = await batchCompatibilityService.checkBatchCapacity(
        currentOrderIds,
        orderId,
        driverId
      );

      if (!capacityCheck.withinCapacity) {
        throw new Error(capacityCheck.reason || 'Batch capacity exceeded');
      }

      // Get order details
      const orderDetails = await this.getOrderDetails([orderId]);
      const newOrder = orderDetails[0];

      // Create new stops for this order (pickup + dropoff)
      const pickupStop: Stop = {
        stopType: 'pickup',
        orderId,
        lat: newOrder.restaurantLat,
        lng: newOrder.restaurantLng,
        address: newOrder.restaurantAddress,
        contactName: 'Restaurant',
        contactPhone: '',
        instructions: '',
      };

      const dropoffStop: Stop = {
        stopType: 'dropoff',
        orderId,
        lat: newOrder.deliveryLat,
        lng: newOrder.deliveryLng,
        address: newOrder.deliveryAddress,
        contactName: newOrder.customerName,
        contactPhone: newOrder.customerPhone,
        instructions: newOrder.deliveryInstructions,
      };

      // Insert stops at appropriate positions
      // For simplicity, add pickup before first dropoff, and dropoff at end
      const currentStops = await db.select()
        .from(batchStops)
        .where(eq(batchStops.batchId, batchId))
        .orderBy(batchStops.stopNumber);

      const firstDropoffIndex = currentStops.findIndex(s => s.stopType === 'dropoff');
      const pickupPosition = firstDropoffIndex > 0 ? firstDropoffIndex : currentStops.length;

      // Shift stop numbers to make room
      await db.execute(sql`
        UPDATE batch_stops
        SET stop_number = stop_number + 2
        WHERE batch_id = ${batchId} AND stop_number >= ${pickupPosition}
      `);

      // Insert new stops
      await db.insert(batchStops).values([
        {
          batchId,
          orderId,
          stopType: 'pickup',
          stopNumber: pickupPosition,
          lat: pickupStop.lat.toString(),
          lng: pickupStop.lng.toString(),
          address: pickupStop.address,
          contactName: pickupStop.contactName,
          contactPhone: pickupStop.contactPhone,
          instructions: pickupStop.instructions,
          status: 'pending',
        },
        {
          batchId,
          orderId,
          stopType: 'dropoff',
          stopNumber: pickupPosition + 1,
          lat: dropoffStop.lat.toString(),
          lng: dropoffStop.lng.toString(),
          address: dropoffStop.address,
          contactName: dropoffStop.contactName,
          contactPhone: dropoffStop.contactPhone,
          instructions: dropoffStop.instructions,
          status: 'pending',
        },
      ]);

      // Update batch
      await db.update(deliveryBatches)
        .set({
          orderIds: [...currentOrderIds, orderId],
          orderCount: currentOrderIds.length + 1,
          updatedAt: new Date(),
        })
        .where(eq(deliveryBatches.id, batchId));

      // Update order
      await db.update(orders)
        .set({ batchId })
        .where(eq(orders.id, orderId));

      // Record modification
      await db.insert(batchModifications).values({
        batchId,
        driverId,
        modificationType: 'add',
        reason: 'order_added_to_batch',
        affectedOrderIds: [orderId],
      });

      logger.info(`Added order ${orderId} to batch ${batchId}`);
    } catch (error) {
      logger.error('Error adding order to batch:', error);
      throw error;
    }
  }

  /**
   * Remove an order from batch (cancel/skip)
   */
  async removeOrderFromBatch(
    batchId: string,
    driverId: string,
    orderId: string,
    reason: string
  ): Promise<void> {
    try {
      // Mark stops as skipped
      await db.update(batchStops)
        .set({ status: 'skipped', updatedAt: new Date() })
        .where(and(
          eq(batchStops.batchId, batchId),
          eq(batchStops.orderId, orderId)
        ));

      // Update batch
      const batch = await db.select()
        .from(deliveryBatches)
        .where(eq(deliveryBatches.id, batchId))
        .limit(1);

      if (batch[0]) {
        const updatedOrderIds = (batch[0].orderIds || []).filter(id => id !== orderId);
        await db.update(deliveryBatches)
          .set({
            orderIds: updatedOrderIds,
            orderCount: updatedOrderIds.length,
            updatedAt: new Date(),
          })
          .where(eq(deliveryBatches.id, batchId));
      }

      // Update order
      await db.update(orders)
        .set({ batchId: null })
        .where(eq(orders.id, orderId));

      // Record modification
      await db.insert(batchModifications).values({
        batchId,
        driverId,
        modificationType: 'remove',
        reason,
        affectedOrderIds: [orderId],
      });

      logger.info(`Removed order ${orderId} from batch ${batchId}`);
    } catch (error) {
      logger.error('Error removing order from batch:', error);
      throw error;
    }
  }

  /**
   * Get active batch for driver
   */
  async getActiveBatch(driverId: string): Promise<any | null> {
    const batches = await db.select()
      .from(deliveryBatches)
      .where(and(
        eq(deliveryBatches.driverId, driverId),
        eq(deliveryBatches.batchStatus, 'active')
      ))
      .limit(1);

    if (batches.length === 0) return null;

    const batch = batches[0];

    // Get stops
    const stops = await db.select()
      .from(batchStops)
      .where(eq(batchStops.batchId, batch.id))
      .orderBy(batchStops.stopNumber);

    return {
      ...batch,
      stops,
    };
  }

  // Helper methods

  private async getOrderDetails(orderIds: string[]): Promise<BatchOrder[]> {
    const orderRecords = await db.select()
      .from(orders)
      .where(inArray(orders.id, orderIds));

    const restaurantIds = Array.from(new Set(orderRecords.map(o => o.restaurantId).filter((id): id is string => !!id)));
    const restaurantRows = restaurantIds.length > 0
      ? await db.select({ id: restaurants.id, address: restaurants.address, latitude: restaurants.latitude, longitude: restaurants.longitude })
          .from(restaurants)
          .where(inArray(restaurants.id, restaurantIds))
      : [];
    const restaurantById = new Map(restaurantRows.map(r => [r.id, r]));

    return orderRecords.map(o => {
      // Pickup point: restaurant (storefront order), or the order's own pickup fields (API delivery job)
      const restaurant = o.restaurantId ? restaurantById.get(o.restaurantId) : undefined;
      return {
        orderId: o.id,
        restaurantId: o.restaurantId || undefined,
        restaurantLat: parseFloat(restaurant?.latitude || o.pickupLat || '0'),
        restaurantLng: parseFloat(restaurant?.longitude || o.pickupLng || '0'),
        restaurantAddress: restaurant?.address || o.pickupAddress || '',
        deliveryLat: parseFloat(o.deliveryLat || '0'),
        deliveryLng: parseFloat(o.deliveryLng || '0'),
        deliveryAddress: o.deliveryAddress || '',
        customerName: o.customerName || '',
        customerPhone: o.customerPhone || '',
        deliveryInstructions: o.notes || '',
        orderValue: parseFloat(o.total),
      };
    });
  }

  private createSimpleSequence(orders: BatchOrder[]): Stop[] {
    const stops: Stop[] = [];

    // All pickups first
    orders.forEach(order => {
      stops.push({
        stopType: 'pickup',
        orderId: order.orderId,
        lat: order.restaurantLat,
        lng: order.restaurantLng,
        address: order.restaurantAddress,
        contactName: 'Restaurant',
        contactPhone: '',
      });
    });

    // Then all dropoffs
    orders.forEach(order => {
      stops.push({
        stopType: 'dropoff',
        orderId: order.orderId,
        lat: order.deliveryLat,
        lng: order.deliveryLng,
        address: order.deliveryAddress,
        contactName: order.customerName,
        contactPhone: order.customerPhone,
        instructions: order.deliveryInstructions,
      });
    });

    return stops;
  }

  private buildVRPStops(orders: BatchOrder[]): VRPStop[] {
    const stops: VRPStop[] = [];
    orders.forEach(order => {
      stops.push({
        id: `pickup_${order.orderId}`,
        type: 'pickup',
        location: { lat: order.restaurantLat, lng: order.restaurantLng },
        address: order.restaurantAddress,
        orderId: order.orderId,
        restaurantId: order.restaurantId,
        estimatedServiceTime: 3,
      });
      stops.push({
        id: `dropoff_${order.orderId}`,
        type: 'dropoff',
        location: { lat: order.deliveryLat, lng: order.deliveryLng },
        address: order.deliveryAddress,
        orderId: order.orderId,
        estimatedServiceTime: 2,
      });
    });
    return stops;
  }

  private convertToStops(optimizedStops: VRPStop[], orders: BatchOrder[]): Stop[] {
    const orderById = new Map(orders.map(o => [o.orderId, o]));
    return optimizedStops.map(vrpStop => {
      const order = orderById.get(vrpStop.orderId);
      return {
        stopType: vrpStop.type,
        orderId: vrpStop.orderId,
        lat: vrpStop.location.lat,
        lng: vrpStop.location.lng,
        address: vrpStop.address,
        contactName: vrpStop.type === 'pickup' ? 'Restaurant' : (order?.customerName || ''),
        contactPhone: vrpStop.type === 'pickup' ? '' : (order?.customerPhone || ''),
        instructions: vrpStop.type === 'dropoff' ? order?.deliveryInstructions : undefined,
      };
    });
  }

  private async createBatchStops(batchId: string, sequence: Stop[]): Promise<any[]> {
    const stopsToInsert = sequence.map((stop, index) => ({
      batchId,
      orderId: stop.orderId,
      stopType: stop.stopType,
      stopNumber: index + 1,
      lat: stop.lat.toString(),
      lng: stop.lng.toString(),
      address: stop.address,
      contactName: stop.contactName,
      contactPhone: stop.contactPhone,
      instructions: stop.instructions || '',
      status: 'pending' as const,
      estimatedArrivalTime: stop.estimatedArrivalTime,
    }));

    return await db.insert(batchStops).values(stopsToInsert).returning();
  }

  private calculateEstimatedEarnings(orders: BatchOrder[]): number {
    // Simple calculation: sum of delivery fees
    // In reality, would factor in distance, time, bonuses, etc.
    return orders.reduce((sum, order) => sum + order.orderValue * 0.15, 0); // 15% of order value
  }

  private async estimateRouteInfo(stops: Stop[]): Promise<any> {
    // Simplified estimation
    // In reality, would use Google Maps to calculate actual route
    return {
      totalDistanceMeters: stops.length * 2000, // 2km per stop estimate
      totalDurationSeconds: stops.length * 600, // 10 min per stop estimate
      estimatedEarnings: stops.length * 5, // $5 per stop estimate
    };
  }

  private async calculateBatchPerformance(batchId: string): Promise<void> {
    try {
      const batch = await db.select()
        .from(deliveryBatches)
        .where(eq(deliveryBatches.id, batchId))
        .limit(1);

      if (!batch[0]) return;

      const stops = await db.select()
        .from(batchStops)
        .where(eq(batchStops.batchId, batchId));

      const completedStops = stops.filter(s => s.status === 'completed').length;
      const skippedStops = stops.filter(s => s.status === 'skipped').length;
      const failedStops = stops.filter(s => s.status === 'failed').length;

      const actualDuration = batch[0].completedAt && batch[0].startedAt
        ? (batch[0].completedAt.getTime() - batch[0].startedAt.getTime()) / 1000
        : 0;

      const routeEfficiency = batch[0].totalDurationSeconds && actualDuration
        ? Math.min(100, (batch[0].totalDurationSeconds / actualDuration) * 100)
        : 100;

      await db.insert(batchPerformance).values({
        batchId,
        driverId: batch[0].driverId,
        totalStops: stops.length,
        completedStops,
        skippedStops,
        failedStops,
        plannedDuration: batch[0].totalDurationSeconds,
        actualDuration: Math.floor(actualDuration),
        plannedDistance: batch[0].totalDistanceMeters ? (batch[0].totalDistanceMeters / 1000).toFixed(2) : '0',
        plannedEarnings: batch[0].estimatedEarnings,
        actualEarnings: batch[0].actualEarnings || batch[0].estimatedEarnings,
        routeEfficiency: routeEfficiency.toFixed(2),
        timeEfficiency: routeEfficiency.toFixed(2),
        completedAt: batch[0].completedAt,
      });

      logger.info(`Calculated performance for batch ${batchId}`);
    } catch (error) {
      logger.error('Error calculating batch performance:', error);
    }
  }
}

export const batchManagementService = new BatchManagementService();
