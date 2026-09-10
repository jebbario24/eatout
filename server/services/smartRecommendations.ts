/**
 * Smart Recommendations Engine
 * 
 * Generates AI-powered actionable recommendations for drivers:
 * - "Work now" - High demand detected
 * - "Best zone" - Where to wait for orders
 * - "Batch opportunity" - Multiple orders nearby
 * - "Peak incoming" - Rush starting soon
 * - "Go home" - Low demand, save gas
 */

import { db } from '../db';
import {
  smartRecommendations,
  deliveryHeatMapData,
  driverLocationHistory,
  orders,
  restaurants,
} from '../../shared/schema';
import { eq, and, gte, lte, sql, isNull, inArray } from 'drizzle-orm';
import logger from '../logger';

interface DriverLocation {
  lat: number;
  lng: number;
}

interface Recommendation {
  type: string;
  priority: number;
  title: string;
  description: string;
  actionUrl?: string;
  expiresAt: Date;
}

export class SmartRecommendationsService {
  /**
   * Generate all active recommendations for a driver
   */
  async generateRecommendations(
    driverId: string,
    location?: DriverLocation
  ): Promise<Recommendation[]> {
    try {
      const recommendations: Recommendation[] = [];
      const currentHour = new Date().getHours();
      const today = new Date().toISOString().split('T')[0];

      // Get driver's current location
      let driverLoc = location;
      if (!driverLoc) {
        const [lastLocation] = await db
          .select()
          .from(driverLocationHistory)
          .where(eq(driverLocationHistory.driverId, driverId))
          .orderBy(sql`${driverLocationHistory.timestamp} DESC`)
          .limit(1);

        if (lastLocation) {
          driverLoc = {
            lat: parseFloat(lastLocation.lat),
            lng: parseFloat(lastLocation.lng),
          };
        }
      }

      // 1. Work Now - Check if current demand is high
      const workNowScore = await this.calculateWorkNowScore(driverLoc, currentHour);
      if (workNowScore > 70) {
        const earningsBoost = Math.round((workNowScore - 50) / 2);
        recommendations.push({
          type: 'work_now',
          priority: 5,
          title: '🔥 High Demand Right Now!',
          description: `Orders are 🔥 hot! Work now for +$${earningsBoost}/hr based on current demand.`,
          actionUrl: '/driver/available-orders',
          expiresAt: this.getExpiry(30), // 30 min
        });
      }

      // 2. Peak Incoming - Predict upcoming rush
      const peakTime = this.predictNextPeak(currentHour);
      if (peakTime && peakTime.minutesUntil < 30) {
        recommendations.push({
          type: 'peak_incoming',
          priority: 4,
          title: `⏰ ${peakTime.name} Rush Starting Soon`,
          description: `Peak time starting in ${peakTime.minutesUntil} min. Get ready for high demand!`,
          actionUrl: '/driver/dashboard',
          expiresAt: this.getExpiry(peakTime.minutesUntil),
        });
      }

      // 3. Best Zone - Recommend where to wait
      if (driverLoc) {
        const bestZone = await this.findBestZone(driverLoc, currentHour);
        if (bestZone && bestZone.distance < 5) {
          // Only if < 5km away
          recommendations.push({
            type: 'best_zone',
            priority: 3,
            title: `📍 High Activity in ${bestZone.zoneName}`,
            description: `${bestZone.orderCount} orders in last hour. Avg earnings: $${bestZone.avgEarnings}/delivery. ${bestZone.distance.toFixed(1)}km away.`,
            actionUrl: '/driver/analytics',
            expiresAt: this.getExpiry(60),
          });
        }
      }

      // 4. Batch Opportunity - Check for nearby orders
      const batchOpp = await this.detectBatchOpportunity(driverId, driverLoc);
      if (batchOpp && batchOpp.orderCount >= 2) {
        recommendations.push({
          type: 'batch',
          priority: 5,
          title: `📦 ${batchOpp.orderCount} Orders Ready Nearby!`,
          description: `Batch opportunity: $${batchOpp.totalEarnings} total, ${batchOpp.totalDistance.toFixed(1)}km combined route.`,
          actionUrl: '/driver/dashboard',
          expiresAt: this.getExpiry(15),
        });
      }

      // 5. Go Home - Low demand warning
      if (workNowScore < 30 && currentHour > 21) {
        // After 9 PM with low demand
        recommendations.push({
          type: 'go_home',
          priority: 2,
          title: '🏠 Low Demand - Consider Ending Shift',
          description: 'Order volume is low. Save gas and try again during peak hours tomorrow.',
          expiresAt: this.getExpiry(120),
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Calculate "work now" score based on current demand
   */
  private async calculateWorkNowScore(
    location: DriverLocation | undefined,
    hour: number
  ): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get heat map data for current hour
      const heatMapData = await db
        .select()
        .from(deliveryHeatMapData)
        .where(
          and(
            eq(deliveryHeatMapData.date, today),
            eq(deliveryHeatMapData.hourOfDay, hour)
          )
        );

      if (heatMapData.length === 0) return 50; // Neutral if no data

      // Average demand score across all grid cells
      const avgDemand =
        heatMapData.reduce((sum, d) => sum + parseFloat(d.demandScore), 0) / heatMapData.length;

      // If location provided, weight nearby cells higher
      if (location) {
        const nearbyCells = heatMapData.filter((d) => {
          const distance = this.calculateDistance(
            location.lat,
            location.lng,
            parseFloat(d.gridLat),
            parseFloat(d.gridLng)
          );
          return distance < 3; // Within 3km
        });

        if (nearbyCells.length > 0) {
          const nearbyDemand =
            nearbyCells.reduce((sum, d) => sum + parseFloat(d.demandScore), 0) / nearbyCells.length;
          // Weight nearby 70%, overall 30%
          return nearbyDemand * 0.7 + avgDemand * 0.3;
        }
      }

      return avgDemand;
    } catch (error) {
      logger.error('Error calculating work now score:', error);
      return 50;
    }
  }

  /**
   * Predict next peak time
   */
  private predictNextPeak(currentHour: number): { name: string; hour: number; minutesUntil: number } | null {
    const peaks = [
      { name: 'Lunch', hour: 12, start: 11, end: 14 },
      { name: 'Dinner', hour: 19, start: 17, end: 21 },
    ];

    for (const peak of peaks) {
      if (currentHour < peak.start) {
        const minutesUntil = (peak.start - currentHour) * 60;
        return { name: peak.name, hour: peak.hour, minutesUntil };
      }
    }

    // Next day lunch
    const hoursUntilNextLunch = 24 - currentHour + 11;
    if (hoursUntilNextLunch < 12) {
      return { name: 'Lunch', hour: 12, minutesUntil: hoursUntilNextLunch * 60 };
    }

    return null;
  }

  /**
   * Find best zone to wait in
   */
  private async findBestZone(
    location: DriverLocation,
    hour: number
  ): Promise<{ zoneName: string; orderCount: number; avgEarnings: number; distance: number } | null> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get zones with activity in last hour
      const zonesData = await db
        .select()
        .from(deliveryHeatMapData)
        .where(and(eq(deliveryHeatMapData.date, today), eq(deliveryHeatMapData.hourOfDay, hour)));

      if (zonesData.length === 0) return null;

      // Find zone with highest demand score near driver
      let bestZone = null;
      let bestScore = 0;

      for (const zone of zonesData) {
        const distance = this.calculateDistance(
          location.lat,
          location.lng,
          parseFloat(zone.gridLat),
          parseFloat(zone.gridLng)
        );

        if (distance > 10) continue; // Skip zones > 10km away

        // Score = demand * (1 / distance_penalty)
        const distancePenalty = 1 + distance / 5; // Penalty increases with distance
        const score = parseFloat(zone.demandScore) / distancePenalty;

        if (score > bestScore) {
          bestScore = score;
          bestZone = {
            zoneName: `Area (${zone.gridLat}, ${zone.gridLng})`,
            orderCount: zone.deliveryCount,
            avgEarnings: zone.deliveryCount > 0 ? parseFloat(zone.totalEarnings) / zone.deliveryCount : 0,
            distance,
          };
        }
      }

      return bestZone;
    } catch (error) {
      logger.error('Error finding best zone:', error);
      return null;
    }
  }

  /**
   * Detect batch delivery opportunity
   */
  private async detectBatchOpportunity(
    driverId: string,
    location: DriverLocation | undefined
  ): Promise<{ orderCount: number; totalEarnings: number; totalDistance: number } | null> {
    try {
      if (!location) return null;

      // Find pending orders nearby (within 3km of driver)
      const nearbyOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.status, 'pending'),
            isNull(orders.assignedDriverId) // Not yet assigned
          )
        );

      const restaurantIds = Array.from(new Set(nearbyOrders.map(o => o.restaurantId).filter((id): id is string => !!id)));
      const restaurantRows = restaurantIds.length > 0
        ? await db.select({ id: restaurants.id, latitude: restaurants.latitude, longitude: restaurants.longitude })
            .from(restaurants)
            .where(inArray(restaurants.id, restaurantIds))
        : [];
      const restaurantById = new Map(restaurantRows.map(r => [r.id, r]));

      const ordersNearby = nearbyOrders.filter((order) => {
        // Pickup location: restaurant (storefront order), or the order's own pickup fields (API delivery job)
        const restaurant = order.restaurantId ? restaurantById.get(order.restaurantId) : undefined;
        const pickupLat = restaurant?.latitude || order.pickupLat;
        const pickupLng = restaurant?.longitude || order.pickupLng;
        if (!pickupLat || !pickupLng) return false;
        const distance = this.calculateDistance(
          location.lat,
          location.lng,
          parseFloat(pickupLat),
          parseFloat(pickupLng)
        );
        return distance < 3; // Within 3km
      });

      if (ordersNearby.length < 2) return null;

      const totalEarnings = ordersNearby.reduce((sum, o) => sum + parseFloat(o.deliveryFee || '0'), 0);
      const totalDistance = ordersNearby.length * 5; // Rough estimate

      return {
        orderCount: ordersNearby.length,
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        totalDistance,
      };
    } catch (error) {
      logger.error('Error detecting batch opportunity:', error);
      return null;
    }
  }

  /**
   * Save recommendations to database
   */
  async saveRecommendations(driverId: string, recommendations: Recommendation[]): Promise<void> {
    try {
      if (recommendations.length === 0) return;

      // Clear old recommendations for this driver
      await db
        .delete(smartRecommendations)
        .where(
          and(
            eq(smartRecommendations.driverId, driverId),
            isNull(smartRecommendations.dismissedAt),
            lte(smartRecommendations.expiresAt, new Date())
          )
        );

      // Insert new recommendations
      await db.insert(smartRecommendations).values(
        recommendations.map((rec) => ({
          driverId,
          recommendationType: rec.type,
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          actionUrl: rec.actionUrl || null,
          expiresAt: rec.expiresAt,
        }))
      );

      logger.info(`Saved ${recommendations.length} recommendations for driver ${driverId}`);
    } catch (error) {
      logger.error('Error saving recommendations:', error);
    }
  }

  /**
   * Get active recommendations for driver
   */
  async getActiveRecommendations(driverId: string): Promise<any[]> {
    try {
      const now = new Date();
      return await db
        .select()
        .from(smartRecommendations)
        .where(
          and(
            eq(smartRecommendations.driverId, driverId),
            isNull(smartRecommendations.dismissedAt),
            gte(smartRecommendations.expiresAt, now)
          )
        )
        .orderBy(sql`${smartRecommendations.priority} DESC, ${smartRecommendations.createdAt} DESC`);
    } catch (error) {
      logger.error('Error getting active recommendations:', error);
      return [];
    }
  }

  /**
   * Dismiss a recommendation
   */
  async dismissRecommendation(recommendationId: string, driverId: string): Promise<void> {
    try {
      await db
        .update(smartRecommendations)
        .set({ dismissedAt: new Date() })
        .where(
          and(eq(smartRecommendations.id, recommendationId), eq(smartRecommendations.driverId, driverId))
        );
    } catch (error) {
      logger.error('Error dismissing recommendation:', error);
    }
  }

  /**
   * Mark recommendation as acted upon
   */
  async actOnRecommendation(recommendationId: string, driverId: string): Promise<void> {
    try {
      await db
        .update(smartRecommendations)
        .set({ actedUponAt: new Date() })
        .where(
          and(eq(smartRecommendations.id, recommendationId), eq(smartRecommendations.driverId, driverId))
        );
    } catch (error) {
      logger.error('Error marking recommendation as acted upon:', error);
    }
  }

  // Helper methods

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private getExpiry(minutes: number): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + minutes);
    return expiry;
  }
}

export const smartRecommendationsService = new SmartRecommendationsService();
