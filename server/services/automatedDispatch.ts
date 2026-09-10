/**
 * Automated Dispatch Service
 * 
 * Handles automated order assignment to drivers using smart matching,
 * priority queues, auto-accept, and penalty management.
 */

import { db } from '../db';
import {
  dispatchQueue,
  dispatchAssignments,
  driverScores,
  dispatchPreferences,
  rejectionPenalties,
  assignmentHistory,
  orders,
  restaurants,
  users
} from '../../shared/schema';
import { eq, and, sql, desc, lt, or } from 'drizzle-orm';
import logger from '../logger';
import { driverMatchingService } from './driverMatching';
import { broadcastNewOrderToDrivers } from '../websocket';

interface AutoDispatchOptions {
  maxAttempts?: number;
  assignmentTimeout?: number; // seconds
  escalationThreshold?: number; // minutes
  broadcastIfNoMatch?: boolean;
}

export class AutomatedDispatchService {
  private readonly DEFAULT_ASSIGNMENT_TIMEOUT = 30; // 30 seconds
  private readonly DEFAULT_MAX_ATTEMPTS = 3;
  private readonly DEFAULT_ESCALATION_THRESHOLD = 10; // 10 minutes

  /**
   * Add order to dispatch queue
   */
  async addToQueue(
    orderId: string,
    restaurantId: string | null,
    orderData: {
      restaurantLat: number;
      restaurantLng: number;
      deliveryLat: number;
      deliveryLng: number;
      estimatedPrepTime?: number;
      orderValue: number;
      isPriority?: boolean;
    }
  ): Promise<void> {
    try {
      // Calculate initial priority
      const priority = this.calculateInitialPriority(orderData);
      const urgencyScore = 50; // Start at medium urgency
      const distanceScore = 50;
      const valueScore = this.calculateValueScore(orderData.orderValue);

      await db.insert(dispatchQueue).values({
        orderId,
        restaurantId,
        priority,
        urgencyScore: urgencyScore.toFixed(2),
        distanceScore: distanceScore.toFixed(2),
        valueScore: valueScore.toFixed(2),
        orderPlacedAt: new Date(),
        estimatedPrepTime: orderData.estimatedPrepTime || 15,
        targetPickupTime: new Date(Date.now() + (orderData.estimatedPrepTime || 15) * 60 * 1000),
        maxWaitTime: this.DEFAULT_ESCALATION_THRESHOLD,
        restaurantLat: orderData.restaurantLat.toString(),
        restaurantLng: orderData.restaurantLng.toString(),
        deliveryLat: orderData.deliveryLat.toString(),
        deliveryLng: orderData.deliveryLng.toString(),
        status: 'pending',
      });

      logger.info(`Order ${orderId} added to dispatch queue with priority ${priority}`);

      // Immediately try to dispatch
      await this.processQueue();
    } catch (error) {
      logger.error(`Error adding order ${orderId} to dispatch queue:`, error);
      throw error;
    }
  }

  /**
   * Process dispatch queue (main dispatch loop)
   */
  async processQueue(options: AutoDispatchOptions = {}): Promise<void> {
    const {
      maxAttempts = this.DEFAULT_MAX_ATTEMPTS,
      assignmentTimeout = this.DEFAULT_ASSIGNMENT_TIMEOUT,
      escalationThreshold = this.DEFAULT_ESCALATION_THRESHOLD,
      broadcastIfNoMatch = true,
    } = options;

    try {
      // Get pending orders sorted by priority
      const pendingOrders = await db
        .select()
        .from(dispatchQueue)
        .where(eq(dispatchQueue.status, 'pending'))
        .orderBy(desc(dispatchQueue.priority), dispatchQueue.createdAt);

      if (pendingOrders.length === 0) {
        logger.info('No pending orders in dispatch queue');
        return;
      }

      logger.info(`Processing ${pendingOrders.length} orders in dispatch queue`);

      for (const queueItem of pendingOrders) {
        // Check if order should be escalated
        const waitTime = (Date.now() - queueItem.orderPlacedAt.getTime()) / 1000 / 60; // minutes
        if (waitTime > escalationThreshold && !queueItem.isEscalated) {
          await this.escalateOrder(queueItem.id, 'wait_time_exceeded');
        }

        // Check if max attempts reached
        if (queueItem.assignmentAttempts >= maxAttempts) {
          if (broadcastIfNoMatch) {
            await this.broadcastOrder(queueItem.orderId);
          } else {
            await this.markOrderFailed(queueItem.orderId, 'max_attempts_exceeded');
          }
          continue;
        }

        // Try to assign order
        await this.assignOrder(queueItem.orderId, assignmentTimeout);
      }
    } catch (error) {
      logger.error('Error processing dispatch queue:', error);
    }
  }

  /**
   * Assign a specific order to best available driver
   */
  async assignOrder(
    orderId: string,
    timeout: number = this.DEFAULT_ASSIGNMENT_TIMEOUT
  ): Promise<boolean> {
    try {
      // Get queue item
      const queueItems = await db
        .select()
        .from(dispatchQueue)
        .where(eq(dispatchQueue.orderId, orderId))
        .limit(1);

      if (queueItems.length === 0) {
        logger.warn(`Order ${orderId} not found in dispatch queue`);
        return false;
      }

      const queueItem = queueItems[0];

      // Update status to 'assigning'
      await db
        .update(dispatchQueue)
        .set({
          status: 'assigning',
          assignmentAttempts: queueItem.assignmentAttempts + 1,
          lastAssignmentAttempt: new Date(),
        })
        .where(eq(dispatchQueue.id, queueItem.id));

      // Get order details
      const order = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (order.length === 0) {
        logger.error(`Order ${orderId} not found in orders table`);
        return false;
      }

      // Find best driver match
      const bestMatch = await driverMatchingService.findBestMatch({
        orderId,
        restaurantLocation: {
          lat: parseFloat(queueItem.restaurantLat),
          lng: parseFloat(queueItem.restaurantLng),
        },
        deliveryLocation: {
          lat: parseFloat(queueItem.deliveryLat),
          lng: parseFloat(queueItem.deliveryLng),
        },
        orderValue: parseFloat(order[0].total),
        isPriority: queueItem.isEscalated,
        estimatedPrepTime: queueItem.estimatedPrepTime || 15,
      });

      if (!bestMatch) {
        logger.warn(`No suitable driver found for order ${orderId}`);
        await db
          .update(dispatchQueue)
          .set({ status: 'pending' })
          .where(eq(dispatchQueue.id, queueItem.id));
        return false;
      }

      // Check if driver has auto-accept enabled and meets criteria
      const prefs = await db
        .select()
        .from(dispatchPreferences)
        .where(eq(dispatchPreferences.driverId, bestMatch.driverId))
        .limit(1);

      const shouldAutoAccept = this.shouldAutoAccept(prefs[0], bestMatch, queueItem);

      // Create assignment
      const expiresAt = new Date(Date.now() + timeout * 1000);
      const [assignment] = await db.insert(dispatchAssignments).values({
        orderId,
        driverId: bestMatch.driverId,
        assignmentType: 'auto',
        assignmentScore: bestMatch.score.toFixed(2),
        status: shouldAutoAccept ? 'accepted' : 'pending',
        driverLat: bestMatch.location.lat.toString(),
        driverLng: bestMatch.location.lng.toString(),
        distanceToRestaurant: bestMatch.distance.toFixed(2),
        estimatedPickupTime: bestMatch.estimatedPickupTime,
        expiresAt,
      }).returning();

      logger.info(`Order ${orderId} assigned to driver ${bestMatch.driverId} with score ${bestMatch.score.toFixed(2)} (auto-accept: ${shouldAutoAccept})`);

      if (shouldAutoAccept) {
        // Auto-accept the order
        await this.handleAcceptance(assignment.id, bestMatch.driverId, 0);
        return true;
      } else {
        // Send notification to driver via WebSocket
        await broadcastNewOrderToDrivers([bestMatch.driverId], {
          orderId,
          assignmentId: assignment.id,
          expiresAt,
          score: bestMatch.score,
          distance: bestMatch.distance,
          estimatedPickupTime: bestMatch.estimatedPickupTime,
        });

        // Set up auto-expiry
        setTimeout(() => this.handleAssignmentExpiry(assignment.id), timeout * 1000);

        return true;
      }
    } catch (error) {
      logger.error(`Error assigning order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Handle driver acceptance
   */
  async handleAcceptance(
    assignmentId: string,
    driverId: string,
    responseTime: number
  ): Promise<void> {
    try {
      const assignment = await db
        .select()
        .from(dispatchAssignments)
        .where(eq(dispatchAssignments.id, assignmentId))
        .limit(1);

      if (assignment.length === 0) {
        logger.error(`Assignment ${assignmentId} not found`);
        return;
      }

      const assign = assignment[0];

      // Update assignment
      await db
        .update(dispatchAssignments)
        .set({
          status: 'accepted',
          responseTime,
          respondedAt: new Date(),
        })
        .where(eq(dispatchAssignments.id, assignmentId));

      // Update queue
      await db
        .update(dispatchQueue)
        .set({
          status: 'assigned',
          assignedDriverId: driverId,
          assignedAt: new Date(),
        })
        .where(eq(dispatchQueue.orderId, assign.orderId));

      // Update driver availability
      await db
        .update(driverScores)
        .set({
          hasActiveDelivery: true,
          isAvailable: false,
        })
        .where(eq(driverScores.driverId, driverId));

      // Update driver score
      await driverMatchingService.updateDriverScoreAfterAssignment(driverId, true, responseTime);

      // Create history record
      await this.createAssignmentHistory(assign.orderId, driverId, 'auto', true);

      logger.info(`Assignment ${assignmentId} accepted by driver ${driverId} in ${responseTime}s`);
    } catch (error) {
      logger.error('Error handling acceptance:', error);
    }
  }

  /**
   * Handle driver rejection
   */
  async handleRejection(
    assignmentId: string,
    driverId: string,
    reason: string,
    category: string,
    responseTime: number
  ): Promise<void> {
    try {
      const assignment = await db
        .select()
        .from(dispatchAssignments)
        .where(eq(dispatchAssignments.id, assignmentId))
        .limit(1);

      if (assignment.length === 0) {
        logger.error(`Assignment ${assignmentId} not found`);
        return;
      }

      const assign = assignment[0];

      // Update assignment
      await db
        .update(dispatchAssignments)
        .set({
          status: 'rejected',
          responseTime,
          respondedAt: new Date(),
          rejectionReason: reason,
          rejectionCategory: category,
        })
        .where(eq(dispatchAssignments.id, assignmentId));

      // Update queue
      await db
        .update(dispatchQueue)
        .set({
          status: 'pending',
          rejectionCount: sql`${dispatchQueue.rejectionCount} + 1`,
        })
        .where(eq(dispatchQueue.orderId, assign.orderId));

      // Apply penalty
      await this.applyRejectionPenalty(driverId, assignmentId, category);

      // Update driver score
      await driverMatchingService.updateDriverScoreAfterAssignment(driverId, false, responseTime);

      logger.info(`Assignment ${assignmentId} rejected by driver ${driverId}. Reason: ${category}`);

      // Try to assign to next best driver
      await this.assignOrder(assign.orderId);
    } catch (error) {
      logger.error('Error handling rejection:', error);
    }
  }

  /**
   * Handle assignment expiry (timeout)
   */
  async handleAssignmentExpiry(assignmentId: string): Promise<void> {
    try {
      const assignment = await db
        .select()
        .from(dispatchAssignments)
        .where(eq(dispatchAssignments.id, assignmentId))
        .limit(1);

      if (assignment.length === 0 || assignment[0].status !== 'pending') {
        return; // Already handled
      }

      const assign = assignment[0];

      // Update assignment
      await db
        .update(dispatchAssignments)
        .set({
          status: 'expired',
          respondedAt: new Date(),
        })
        .where(eq(dispatchAssignments.id, assignmentId));

      // Apply penalty for timeout
      await this.applyRejectionPenalty(assign.driverId!, assignmentId, 'timeout');

      // Update queue
      await db
        .update(dispatchQueue)
        .set({ status: 'pending' })
        .where(eq(dispatchQueue.orderId, assign.orderId));

      logger.warn(`Assignment ${assignmentId} expired (no response from driver ${assign.driverId})`);

      // Try to assign to next best driver
      await this.assignOrder(assign.orderId);
    } catch (error) {
      logger.error('Error handling assignment expiry:', error);
    }
  }

  /**
   * Broadcast order to multiple drivers (fallback method)
   */
  async broadcastOrder(orderId: string, topN: number = 5): Promise<void> {
    try {
      const queueItems = await db
        .select()
        .from(dispatchQueue)
        .where(eq(dispatchQueue.orderId, orderId))
        .limit(1);

      if (queueItems.length === 0) {
        return;
      }

      const queueItem = queueItems[0];
      const order = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

      if (order.length === 0) {
        return;
      }

      // Find top N matches
      const topMatches = await driverMatchingService.findTopMatches(
        {
          orderId,
          restaurantLocation: {
            lat: parseFloat(queueItem.restaurantLat),
            lng: parseFloat(queueItem.restaurantLng),
          },
          deliveryLocation: {
            lat: parseFloat(queueItem.deliveryLat),
            lng: parseFloat(queueItem.deliveryLng),
          },
          orderValue: parseFloat(order[0].total),
          isPriority: true, // Broadcast means it's urgent
        },
        topN
      );

      if (topMatches.length === 0) {
        logger.warn(`No drivers available for broadcast of order ${orderId}`);
        await this.markOrderFailed(orderId, 'no_drivers_available');
        return;
      }

      // Create assignments for all top matches
      const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds for broadcast
      const driverIds = topMatches.map(m => m.driverId);

      for (const match of topMatches) {
        await db.insert(dispatchAssignments).values({
          orderId,
          driverId: match.driverId,
          assignmentType: 'broadcast',
          assignmentScore: match.score.toFixed(2),
          status: 'pending',
          driverLat: match.location.lat.toString(),
          driverLng: match.location.lng.toString(),
          distanceToRestaurant: match.distance.toFixed(2),
          estimatedPickupTime: match.estimatedPickupTime,
          expiresAt,
        });
      }

      // Update queue status
      await db
        .update(dispatchQueue)
        .set({ status: 'assigning' })
        .where(eq(dispatchQueue.id, queueItem.id));

      // Broadcast to all drivers
      await broadcastNewOrderToDrivers(driverIds, {
        orderId,
        broadcast: true,
        expiresAt,
      });

      logger.info(`Order ${orderId} broadcast to ${topMatches.length} drivers`);
    } catch (error) {
      logger.error(`Error broadcasting order ${orderId}:`, error);
    }
  }

  /**
   * Apply rejection penalty to driver
   */
  private async applyRejectionPenalty(
    driverId: string,
    assignmentId: string,
    category: string
  ): Promise<void> {
    try {
      // Determine penalty severity
      let severity: 'minor' | 'moderate' | 'severe';
      let points: number;
      let durationMinutes: number | null;

      switch (category) {
        case 'timeout':
          severity = 'moderate';
          points = 2;
          durationMinutes = 60; // 1 hour
          break;
        case 'too_far':
          severity = 'minor';
          points = 1;
          durationMinutes = 30;
          break;
        case 'break':
        case 'ending_shift':
          severity = 'minor';
          points = 0; // Valid reason, no penalty
          durationMinutes = null;
          break;
        default:
          severity = 'moderate';
          points = 2;
          durationMinutes = 60;
      }

      if (points === 0) {
        return; // No penalty for valid reasons
      }

      const expiresAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60 * 1000) : null;

      await db.insert(rejectionPenalties).values({
        driverId,
        assignmentId,
        penaltyType: 'rejection',
        penaltyPoints: points,
        severity,
        durationMinutes,
        reason: `Rejected/timed out on assignment (${category})`,
        status: 'active',
        expiresAt,
      });

      // Update driver score
      await db
        .update(driverScores)
        .set({
          activePenalties: sql`${driverScores.activePenalties} + 1`,
          penaltyPoints: sql`${driverScores.penaltyPoints} + ${points}`,
        })
        .where(eq(driverScores.driverId, driverId));

      logger.info(`Applied ${severity} penalty (${points} points) to driver ${driverId}`);
    } catch (error) {
      logger.error('Error applying rejection penalty:', error);
    }
  }

  /**
   * Check if order should be auto-accepted
   */
  private shouldAutoAccept(
    preferences: any,
    match: any,
    queueItem: any
  ): boolean {
    if (!preferences || !preferences.autoAcceptEnabled) {
      return false;
    }

    // Check distance
    if (preferences.autoAcceptMaxDistance) {
      const maxDistance = parseFloat(preferences.autoAcceptMaxDistance);
      if (match.distance > maxDistance) {
        return false;
      }
    }

    // Check minimum payout (would need to calculate from order)
    // For now, skip this check

    // Check preferred zones
    if (preferences.autoAcceptOnlyPreferredZones && preferences.preferredZones) {
      // Would need zone data to check
    }

    return true; // Passes all checks
  }

  /**
   * Calculate initial priority for order
   */
  private calculateInitialPriority(orderData: any): number {
    let priority = 50; // Base priority

    // High-value orders get priority boost
    if (orderData.orderValue > 50) priority += 10;
    if (orderData.orderValue > 100) priority += 10;

    // Priority flag
    if (orderData.isPriority) priority += 20;

    return Math.min(priority, 100);
  }

  /**
   * Calculate value score for order
   */
  private calculateValueScore(orderValue: number): number {
    if (orderValue >= 100) return 100;
    if (orderValue <= 10) return 20;
    
    // Linear scale 10-100
    return 20 + ((orderValue - 10) * 0.89);
  }

  /**
   * Escalate order due to long wait time
   */
  private async escalateOrder(queueId: string, reason: string): Promise<void> {
    try {
      await db
        .update(dispatchQueue)
        .set({
          isEscalated: true,
          escalatedAt: new Date(),
          escalationReason: reason,
          priority: sql`LEAST(${dispatchQueue.priority} + 20, 100)`, // Boost priority
        })
        .where(eq(dispatchQueue.id, queueId));

      logger.warn(`Order escalated (${reason}): ${queueId}`);
    } catch (error) {
      logger.error('Error escalating order:', error);
    }
  }

  /**
   * Mark order as failed
   */
  private async markOrderFailed(orderId: string, reason: string): Promise<void> {
    try {
      await db
        .update(dispatchQueue)
        .set({
          status: 'failed',
        })
        .where(eq(dispatchQueue.orderId, orderId));

      logger.error(`Order ${orderId} marked as failed: ${reason}`);
    } catch (error) {
      logger.error('Error marking order as failed:', error);
    }
  }

  /**
   * Create assignment history record
   */
  private async createAssignmentHistory(
    orderId: string,
    driverId: string,
    method: string,
    success: boolean
  ): Promise<void> {
    try {
      // Get queue info
      const queueItem = await db
        .select()
        .from(dispatchQueue)
        .where(eq(dispatchQueue.orderId, orderId))
        .limit(1);

      if (queueItem.length === 0) {
        return;
      }

      const timeInQueue = Math.floor((Date.now() - (queueItem[0].createdAt || new Date()).getTime()) / 1000);

      await db.insert(assignmentHistory).values({
        orderId,
        timeInQueue,
        assignmentAttempts: queueItem[0].assignmentAttempts,
        finalDriverId: driverId,
        assignmentMethod: method,
        wasEscalated: queueItem[0].isEscalated,
        matchQuality: success ? 'good' : 'fair',
      });
    } catch (error) {
      logger.error('Error creating assignment history:', error);
    }
  }
}

export const automatedDispatchService = new AutomatedDispatchService();
