/**
 * Driver Matching Algorithm Service
 * 
 * Implements smart driver-to-order matching using a multi-factor scoring system.
 * Inspired by Hungarian algorithm but optimized for real-time dispatch.
 */

import { db } from '../db';
import { 
  driverScores, 
  dispatchPreferences, 
  driverLocationHistory,
  users,
  orders,
  restaurants
} from '../../shared/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import logger from '../logger';
import { googleMapsService } from './googleMaps';

interface DriverCandidate {
  driverId: string;
  score: number;
  distance: number; // km
  estimatedPickupTime: number; // minutes
  location: { lat: number; lng: number };
  reliabilityScore: number;
  acceptanceRate: number;
  isPreferred: boolean;
}

interface MatchingCriteria {
  orderId: string;
  restaurantLocation: { lat: number; lng: number };
  deliveryLocation: { lat: number; lng: number };
  orderValue: number;
  isPriority: boolean;
  estimatedPrepTime?: number;
  requiredCapabilities?: string[];
}

interface MatchingWeights {
  distance: number; // Weight for proximity
  reliability: number; // Weight for driver reliability
  speed: number; // Weight for estimated pickup time
  acceptance: number; // Weight for acceptance rate
  activity: number; // Weight for recent activity
}

export class DriverMatchingService {
  // Default weights (can be adjusted based on business needs)
  private defaultWeights: MatchingWeights = {
    distance: 0.35, // 35% - Most important
    reliability: 0.25, // 25%
    speed: 0.20, // 20%
    acceptance: 0.15, // 15%
    activity: 0.05, // 5%
  };

  /**
   * Find the best driver for an order
   */
  async findBestMatch(
    criteria: MatchingCriteria,
    weights: Partial<MatchingWeights> = {}
  ): Promise<DriverCandidate | null> {
    const candidates = await this.findAvailableDrivers(criteria);
    
    if (candidates.length === 0) {
      logger.warn(`No available drivers found for order ${criteria.orderId}`);
      return null;
    }

    const scoredCandidates = await this.scoreDrivers(candidates, criteria, weights);
    
    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    logger.info(`Found ${scoredCandidates.length} candidates for order ${criteria.orderId}. Best match: ${scoredCandidates[0].driverId} with score ${scoredCandidates[0].score.toFixed(2)}`);
    
    return scoredCandidates[0];
  }

  /**
   * Find multiple best matches (for broadcast/fallback scenarios)
   */
  async findTopMatches(
    criteria: MatchingCriteria,
    limit: number = 5,
    weights: Partial<MatchingWeights> = {}
  ): Promise<DriverCandidate[]> {
    const candidates = await this.findAvailableDrivers(criteria);
    
    if (candidates.length === 0) {
      return [];
    }

    const scoredCandidates = await this.scoreDrivers(candidates, criteria, weights);
    
    // Sort by score (highest first) and limit
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    return scoredCandidates.slice(0, limit);
  }

  /**
   * Find all available drivers near the restaurant
   */
  private async findAvailableDrivers(
    criteria: MatchingCriteria,
    maxDistance: number = 15 // km
  ): Promise<Array<{
    driverId: string;
    location: { lat: number; lng: number };
    score: any;
    preferences: any;
  }>> {
    try {
      // Get online, available drivers with no active delivery
      const availableDrivers = await db
        .select({
          driverId: driverScores.driverId,
          score: driverScores,
          preferences: dispatchPreferences,
          location: sql<{ lat: number; lng: number }>`
            (SELECT jsonb_build_object(
              'lat', CAST(lat AS FLOAT),
              'lng', CAST(lng AS FLOAT)
            )
            FROM ${driverLocationHistory}
            WHERE ${driverLocationHistory.driverId} = ${driverScores.driverId}
            ORDER BY ${driverLocationHistory.timestamp} DESC
            LIMIT 1)
          `,
        })
        .from(driverScores)
        .leftJoin(dispatchPreferences, eq(dispatchPreferences.driverId, driverScores.driverId))
        .where(
          and(
            eq(driverScores.isOnline, true),
            eq(driverScores.isAvailable, true),
            eq(driverScores.hasActiveDelivery, false)
          )
        );

      // Filter by distance (rough approximation first)
      const nearbyDrivers = availableDrivers.filter(driver => {
        if (!driver.location || !driver.location.lat || !driver.location.lng) {
          return false;
        }

        const distance = this.calculateHaversineDistance(
          criteria.restaurantLocation,
          driver.location
        );

        return distance <= maxDistance;
      });

      logger.info(`Found ${nearbyDrivers.length} available drivers within ${maxDistance}km of restaurant`);

      return nearbyDrivers;
    } catch (error) {
      logger.error('Error finding available drivers:', error);
      return [];
    }
  }

  /**
   * Score drivers based on multiple factors
   */
  private async scoreDrivers(
    drivers: Array<{
      driverId: string;
      location: { lat: number; lng: number };
      score: any;
      preferences: any;
    }>,
    criteria: MatchingCriteria,
    customWeights: Partial<MatchingWeights> = {}
  ): Promise<DriverCandidate[]> {
    const weights = { ...this.defaultWeights, ...customWeights };
    const scoredDrivers: DriverCandidate[] = [];

    for (const driver of drivers) {
      try {
        // 1. Distance Score (0-100, inverse of distance)
        const distance = await this.getPreciseDistance(
          driver.location,
          criteria.restaurantLocation
        );
        const distanceScore = this.calculateDistanceScore(distance);

        // 2. Reliability Score (from driver profile)
        const reliabilityScore = parseFloat(driver.score.reliabilityScore || '100');

        // 3. Speed Score (based on average pickup time)
        const avgPickupTime = driver.score.avgPickupTime || 15;
        const speedScore = this.calculateSpeedScore(avgPickupTime);

        // 4. Acceptance Rate Score
        const acceptanceRate = parseFloat(driver.score.acceptanceRate || '100');

        // 5. Activity Score (recent deliveries)
        const activityScore = this.calculateActivityScore(
          driver.score.deliveriesLast7Days || 0
        );

        // 6. Preference Bonus
        const preferenceBonus = this.calculatePreferenceBonus(
          driver.preferences,
          criteria
        );

        // Calculate weighted total score
        const totalScore = 
          (distanceScore * weights.distance) +
          (reliabilityScore * weights.reliability) +
          (speedScore * weights.speed) +
          (acceptanceRate * weights.acceptance) +
          (activityScore * weights.activity) +
          preferenceBonus;

        // Estimate pickup time
        const estimatedPickupTime = Math.ceil(distance / 0.5); // Assume 30 km/h average speed

        scoredDrivers.push({
          driverId: driver.driverId,
          score: Math.min(totalScore, 100), // Cap at 100
          distance,
          estimatedPickupTime,
          location: driver.location,
          reliabilityScore,
          acceptanceRate,
          isPreferred: preferenceBonus > 0,
        });
      } catch (error) {
        logger.error(`Error scoring driver ${driver.driverId}:`, error);
      }
    }

    return scoredDrivers;
  }

  /**
   * Calculate distance score (inverse relationship)
   * Closer = Higher score
   */
  private calculateDistanceScore(distance: number): number {
    if (distance === 0) return 100;
    if (distance >= 10) return 0; // Beyond 10km = 0 score
    
    // Exponential decay: closer is significantly better
    return Math.max(0, 100 * Math.exp(-0.3 * distance));
  }

  /**
   * Calculate speed score based on average pickup time
   * Faster = Higher score
   */
  private calculateSpeedScore(avgPickupTime: number): number {
    if (avgPickupTime <= 5) return 100;
    if (avgPickupTime >= 20) return 0;
    
    // Linear scale: 5-20 minutes
    return 100 - ((avgPickupTime - 5) * 6.67);
  }

  /**
   * Calculate activity score based on recent deliveries
   * More active = Higher score
   */
  private calculateActivityScore(deliveriesLast7Days: number): number {
    if (deliveriesLast7Days >= 35) return 100; // 5+ per day
    if (deliveriesLast7Days === 0) return 50; // Not 0 to give new drivers a chance
    
    // Scale: 0-35 deliveries → 50-100 score
    return 50 + (deliveriesLast7Days * 1.43);
  }

  /**
   * Calculate preference bonus
   * Drivers with preferences matching the order get a bonus
   */
  private calculatePreferenceBonus(
    preferences: any,
    criteria: MatchingCriteria
  ): number {
    if (!preferences) return 0;

    let bonus = 0;

    // Check if order meets auto-accept criteria
    if (preferences.autoAcceptEnabled) {
      // Distance check
      if (preferences.autoAcceptMaxDistance) {
        const maxDistance = parseFloat(preferences.autoAcceptMaxDistance);
        // Already filtered by distance, so give bonus
        bonus += 5;
      }

      // Minimum payout check
      if (preferences.autoAcceptMinPayout) {
        const minPayout = parseFloat(preferences.autoAcceptMinPayout);
        if (criteria.orderValue >= minPayout) {
          bonus += 5;
        }
      }

      // Preferred restaurants
      if (preferences.preferredRestaurants && preferences.preferredRestaurants.length > 0) {
        // Would need restaurantId in criteria to check
        bonus += 3;
      }
    }

    // Priority drivers
    return bonus;
  }

  /**
   * Get precise distance using Google Maps API
   */
  private async getPreciseDistance(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<number> {
    try {
      const result = await googleMapsService.calculateDistanceMatrix(
        [origin],
        [destination]
      );

      const element = result?.rows?.[0]?.elements?.[0];
      if (element && element.status === 'OK') {
        return element.distance.value / 1000; // Convert meters to km
      }
    } catch (error) {
      logger.warn('Failed to get precise distance from Google Maps, using Haversine:', error);
    }

    // Fallback to Haversine distance
    return this.calculateHaversineDistance(origin, destination);
  }

  /**
   * Calculate Haversine distance (straight-line distance)
   */
  private calculateHaversineDistance(
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
   * Update driver score after an assignment
   */
  async updateDriverScoreAfterAssignment(
    driverId: string,
    accepted: boolean,
    responseTime: number
  ): Promise<void> {
    try {
      const score = await db.select().from(driverScores).where(eq(driverScores.driverId, driverId)).limit(1);
      
      if (score.length === 0) {
        logger.warn(`No score record found for driver ${driverId}`);
        return;
      }

      const current = score[0];
      const totalAssignments = current.totalDeliveries + 1;

      // Update acceptance rate
      const currentAcceptances = (parseFloat(current.acceptanceRate) / 100) * current.totalDeliveries;
      const newAcceptances = currentAcceptances + (accepted ? 1 : 0);
      const newAcceptanceRate = (newAcceptances / totalAssignments) * 100;

      // Update avg response time
      const currentTotalResponseTime = (current.avgResponseTime || 10) * current.totalDeliveries;
      const newTotalResponseTime = currentTotalResponseTime + responseTime;
      const newAvgResponseTime = Math.round(newTotalResponseTime / totalAssignments);

      await db.update(driverScores)
        .set({
          acceptanceRate: newAcceptanceRate.toFixed(2),
          avgResponseTime: newAvgResponseTime,
          updatedAt: new Date(),
        })
        .where(eq(driverScores.driverId, driverId));

      logger.info(`Updated score for driver ${driverId}: acceptance rate ${newAcceptanceRate.toFixed(2)}%`);
    } catch (error) {
      logger.error('Error updating driver score:', error);
    }
  }
}

export const driverMatchingService = new DriverMatchingService();
