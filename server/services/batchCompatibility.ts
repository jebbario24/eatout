/**
 * Batch Compatibility Checker Service
 * 
 * Determines if orders can be batched together based on:
 * - Location proximity
 * - Time windows
 * - Order value/size
 * - Restaurant compatibility
 */

import { db } from '../db';
import { orders, restaurants, batchCompatibility } from '../../shared/schema';
import { eq, and, or } from 'drizzle-orm';
import logger from '../logger';
import { googleMapsService } from './googleMaps';

interface CompatibilityResult {
  isCompatible: boolean;
  overallScore: number;
  locationScore: number;
  timeScore: number;
  valueScore: number;
  distanceBetween: number;
  timeDifference: number;
  sameRestaurant: boolean;
  incompatibilityReasons: string[];
}

export class BatchCompatibilityService {
  // Compatibility thresholds
  private readonly MIN_OVERALL_SCORE = 60; // Minimum score to batch (0-100)
  private readonly MAX_DISTANCE_KM = 10; // Max distance between delivery locations
  private readonly MAX_TIME_DIFF_MINUTES = 30; // Max time difference between orders
  private readonly MAX_DETOUR_FACTOR = 1.5; // Max detour (1.5 = 50% longer route)

  /**
   * Check if two orders are compatible for batching
   */
  async checkCompatibility(order1Id: string, order2Id: string, useCache: boolean = true): Promise<CompatibilityResult> {
    try {
      // Check cache first
      if (useCache) {
        const cached = await this.getCachedCompatibility(order1Id, order2Id);
        if (cached) {
          logger.info(`Using cached compatibility for orders ${order1Id} + ${order2Id}`);
          return cached;
        }
      }

      // Get both orders with details
      const [order1, order2] = await Promise.all([
        db.select().from(orders).where(eq(orders.id, order1Id)).limit(1),
        db.select().from(orders).where(eq(orders.id, order2Id)).limit(1),
      ]);

      if (!order1[0] || !order2[0]) {
        throw new Error('One or both orders not found');
      }

      const o1 = order1[0];
      const o2 = order2[0];

      // Calculate compatibility factors
      const sameRestaurant = o1.restaurantId === o2.restaurantId;
      
      // Location score
      const distanceBetween = await this.calculateDistance(
        { lat: parseFloat(o1.deliveryLat!), lng: parseFloat(o1.deliveryLng!) },
        { lat: parseFloat(o2.deliveryLat!), lng: parseFloat(o2.deliveryLng!) }
      );
      const locationScore = this.calculateLocationScore(distanceBetween, sameRestaurant);

      // Time score
      const timeDifference = Math.abs(
        new Date(o1.createdAt || 0).getTime() - new Date(o2.createdAt || 0).getTime()
      ) / 1000; // seconds
      const timeScore = this.calculateTimeScore(timeDifference);

      // Value score (similar sized orders batch better)
      const valueScore = this.calculateValueScore(
        parseFloat(o1.total),
        parseFloat(o2.total)
      );

      // Overall score (weighted average)
      const overallScore = 
        locationScore * 0.5 + // 50% weight on location
        timeScore * 0.3 +     // 30% weight on time
        valueScore * 0.2;     // 20% weight on value

      // Determine incompatibility reasons
      const incompatibilityReasons: string[] = [];
      if (distanceBetween > this.MAX_DISTANCE_KM) {
        incompatibilityReasons.push(`Delivery locations too far apart (${distanceBetween.toFixed(1)}km)`);
      }
      if (timeDifference > this.MAX_TIME_DIFF_MINUTES * 60) {
        incompatibilityReasons.push(`Orders placed too far apart (${(timeDifference / 60).toFixed(0)} min)`);
      }
      if (locationScore < 30) {
        incompatibilityReasons.push('Poor location compatibility');
      }
      if (timeScore < 30) {
        incompatibilityReasons.push('Poor time window compatibility');
      }

      const isCompatible = overallScore >= this.MIN_OVERALL_SCORE && incompatibilityReasons.length === 0;

      const result: CompatibilityResult = {
        isCompatible,
        overallScore,
        locationScore,
        timeScore,
        valueScore,
        distanceBetween,
        timeDifference,
        sameRestaurant,
        incompatibilityReasons,
      };

      // Cache the result
      await this.cacheCompatibility(order1Id, order2Id, result);

      return result;
    } catch (error) {
      logger.error('Error checking batch compatibility:', error);
      throw error;
    }
  }

  /**
   * Find all orders compatible with a given order
   */
  async findCompatibleOrders(orderId: string, candidateOrderIds: string[]): Promise<string[]> {
    const compatible: string[] = [];

    for (const candidateId of candidateOrderIds) {
      if (candidateId === orderId) continue;

      try {
        const result = await this.checkCompatibility(orderId, candidateId);
        if (result.isCompatible) {
          compatible.push(candidateId);
        }
      } catch (error) {
        logger.error(`Error checking compatibility for ${orderId} + ${candidateId}:`, error);
      }
    }

    return compatible;
  }

  /**
   * Calculate location compatibility score
   */
  private calculateLocationScore(distanceKm: number, sameRestaurant: boolean): number {
    let score = 100;

    // Distance penalty (exponential decay)
    if (distanceKm > this.MAX_DISTANCE_KM) {
      return 0;
    }
    score = 100 * Math.exp(-0.2 * distanceKm); // Closer = higher score

    // Same restaurant bonus
    if (sameRestaurant) {
      score = Math.min(score + 20, 100);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate time compatibility score
   */
  private calculateTimeScore(timeDifferenceSeconds: number): number {
    const timeDifferenceMinutes = timeDifferenceSeconds / 60;

    if (timeDifferenceMinutes > this.MAX_TIME_DIFF_MINUTES) {
      return 0;
    }

    // Linear decay: closer in time = higher score
    const score = 100 * (1 - timeDifferenceMinutes / this.MAX_TIME_DIFF_MINUTES);
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate value compatibility score
   */
  private calculateValueScore(value1: number, value2: number): number {
    const maxValue = Math.max(value1, value2);
    const minValue = Math.min(value1, value2);

    if (maxValue === 0) return 50; // Neutral score for free orders

    // Ratio of values (1.0 = same value, 0.5 = one is half, etc.)
    const ratio = minValue / maxValue;

    // Score based on how similar the values are
    return ratio * 100;
  }

  /**
   * Calculate distance between two points
   */
  private async calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): Promise<number> {
    try {
      // Use Google Maps for actual driving distance
      const result = await googleMapsService.calculateDistanceMatrix([point1], [point2]);
      const element = result?.rows?.[0]?.elements?.[0];
      if (element && element.status === 'OK') {
        return element.distance.value / 1000; // meters to km
      }
    } catch (error) {
      logger.warn('Google Maps distance failed, using Haversine:', error);
    }

    // Fallback to Haversine (straight-line distance)
    return this.haversineDistance(point1, point2);
  }

  /**
   * Haversine distance calculation
   */
  private haversineDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLon = this.toRadians(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) *
        Math.cos(this.toRadians(point2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get cached compatibility result
   */
  private async getCachedCompatibility(
    order1Id: string,
    order2Id: string
  ): Promise<CompatibilityResult | null> {
    try {
      const cached = await db
        .select()
        .from(batchCompatibility)
        .where(
          or(
            and(
              eq(batchCompatibility.order1Id, order1Id),
              eq(batchCompatibility.order2Id, order2Id)
            ),
            and(
              eq(batchCompatibility.order1Id, order2Id),
              eq(batchCompatibility.order2Id, order1Id)
            )
          )
        )
        .limit(1);

      if (cached.length === 0) return null;

      const result = cached[0];

      // Check if cache is expired
      if (result.expiresAt && new Date() > result.expiresAt) {
        return null;
      }

      return {
        isCompatible: result.isCompatible,
        overallScore: parseFloat(result.overallScore),
        locationScore: parseFloat(result.locationScore || '0'),
        timeScore: parseFloat(result.timeScore || '0'),
        valueScore: parseFloat(result.valueScore || '0'),
        distanceBetween: parseFloat(result.distanceBetween || '0'),
        timeDifference: result.timeDifference || 0,
        sameRestaurant: result.sameRestaurant,
        incompatibilityReasons: result.incompatibilityReasons || [],
      };
    } catch (error) {
      logger.error('Error getting cached compatibility:', error);
      return null;
    }
  }

  /**
   * Cache compatibility result
   */
  private async cacheCompatibility(
    order1Id: string,
    order2Id: string,
    result: CompatibilityResult
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes cache

      await db.insert(batchCompatibility).values({
        order1Id,
        order2Id,
        overallScore: result.overallScore.toFixed(2),
        locationScore: result.locationScore.toFixed(2),
        timeScore: result.timeScore.toFixed(2),
        valueScore: result.valueScore.toFixed(2),
        distanceBetween: result.distanceBetween.toFixed(2),
        timeDifference: result.timeDifference,
        sameRestaurant: result.sameRestaurant,
        isCompatible: result.isCompatible,
        incompatibilityReasons: result.incompatibilityReasons,
        expiresAt,
      });
    } catch (error) {
      // Ignore cache errors (non-critical)
      logger.warn('Failed to cache compatibility:', error);
    }
  }

  /**
   * Check if adding an order to a batch would exceed capacity
   */
  async checkBatchCapacity(
    existingOrderIds: string[],
    newOrderId: string,
    driverId: string
  ): Promise<{ withinCapacity: boolean; reason?: string }> {
    try {
      // Get driver capabilities
      const { driverCapabilities } = await import('../../shared/schema');
      const capabilities = await db
        .select()
        .from(driverCapabilities)
        .where(eq(driverCapabilities.driverId, driverId))
        .limit(1);

      if (capabilities.length === 0) {
        // Default capacity if not set
        if (existingOrderIds.length >= 4) {
          return {
            withinCapacity: false,
            reason: 'Batch would exceed default capacity (4 orders)',
          };
        }
        return { withinCapacity: true };
      }

      const cap = capabilities[0];
      const maxOrders = cap.maxOrders || 4;

      if (existingOrderIds.length + 1 > maxOrders) {
        return {
          withinCapacity: false,
          reason: `Batch would exceed driver capacity (${maxOrders} orders)`,
        };
      }

      return { withinCapacity: true };
    } catch (error) {
      logger.error('Error checking batch capacity:', error);
      return {
        withinCapacity: false,
        reason: 'Error checking capacity',
      };
    }
  }
}

export const batchCompatibilityService = new BatchCompatibilityService();
