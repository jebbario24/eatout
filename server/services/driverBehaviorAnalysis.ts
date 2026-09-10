/**
 * Driver Behavior Analysis Service
 * 
 * Analyzes driver patterns to provide personalized insights:
 * - Speed score: Time per delivery vs average
 * - Route efficiency: Actual vs optimal distance
 * - Zone mastery: Performance by area
 * - Peak performance times: When driver is fastest
 * - Acceptance patterns: Which orders work best
 * 
 * Generates actionable insights to help drivers improve
 */

import { db } from '../db';
import {
  driverBehaviorPatterns,
  orders,
  driverEarningsHistory,
  driverPerformanceMetrics,
  deliveryHeatMapData,
} from '../../shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import logger from '../logger';

interface DriverInsight {
  category: string;
  insight: string;
  impact: 'positive' | 'neutral' | 'negative';
  actionable: boolean;
}

export class DriverBehaviorAnalysisService {
  /**
   * Analyze driver's speed relative to average
   * @param driverId driver_profiles.id
   */
  async analyzeDriverSpeed(
    driverId: string,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<{ speedScore: number; avgMinutesPerDelivery: number; comparison: string }> {
    try {
      const dateFilter = this.getDateFilter(period);
      const startDate = dateFilter.toISOString().split('T')[0];

      // Get driver's completed deliveries
      const driverDeliveries = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.assignedDriverId, driverId),
            eq(orders.status, 'delivered'),
            gte(orders.deliveryTime, dateFilter)
          )
        );

      if (driverDeliveries.length === 0) {
        return {
          speedScore: 50,
          avgMinutesPerDelivery: 0,
          comparison: 'Not enough data',
        };
      }

      // Calculate average time per delivery
      let totalMinutes = 0;
      let validCount = 0;

      for (const delivery of driverDeliveries) {
        if (delivery.pickupTime && delivery.deliveryTime) {
          const pickupTime = new Date(delivery.pickupTime).getTime();
          const deliveryTime = new Date(delivery.deliveryTime).getTime();
          const minutes = (deliveryTime - pickupTime) / (1000 * 60);
          if (minutes > 0 && minutes < 120) {
            // Reasonable delivery time
            totalMinutes += minutes;
            validCount++;
          }
        }
      }

      if (validCount === 0) {
        return {
          speedScore: 50,
          avgMinutesPerDelivery: 0,
          comparison: 'Not enough data',
        };
      }

      const avgMinutes = totalMinutes / validCount;

      // Compare to platform average (assume 25 min is average)
      const platformAvg = 25;
      const speedScore = Math.round((platformAvg / avgMinutes) * 100);

      let comparison = 'Average speed';
      if (speedScore > 120) comparison = 'Significantly faster than average';
      else if (speedScore > 105) comparison = 'Faster than average';
      else if (speedScore < 80) comparison = 'Slower than average';

      return {
        speedScore: Math.min(150, Math.max(0, speedScore)),
        avgMinutesPerDelivery: Math.round(avgMinutes),
        comparison,
      };
    } catch (error) {
      logger.error('Error analyzing driver speed:', error);
      return {
        speedScore: 50,
        avgMinutesPerDelivery: 0,
        comparison: 'Error analyzing',
      };
    }
  }

  /**
   * Calculate zone mastery - which areas driver performs best in
   * @param driverId driver_profiles.id
   */
  async calculateZoneMastery(
    driverId: string
  ): Promise<Array<{ zone: string; deliveryCount: number; avgEarnings: number; efficiency: number }>> {
    try {
      const thirtyDaysAgo = this.getDateFilter('month');

      // Get deliveries grouped by delivery zone (approximate by lat/lng)
      const deliveries = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.assignedDriverId, driverId),
            eq(orders.status, 'delivered'),
            gte(orders.deliveryTime, thirtyDaysAgo)
          )
        );

      // Group by grid cell (0.05 degree precision ~5km)
      const zoneMap = new Map<
        string,
        { count: number; totalEarnings: number; totalTime: number; validTime: number }
      >();

      for (const delivery of deliveries) {
        if (!delivery.deliveryLat || !delivery.deliveryLng) continue;

        const gridKey = this.getGridKey(parseFloat(delivery.deliveryLat), parseFloat(delivery.deliveryLng));
        const earnings = parseFloat(delivery.deliveryFee || '0');

        let timeMinutes = 0;
        if (delivery.pickupTime && delivery.deliveryTime) {
          timeMinutes = (new Date(delivery.deliveryTime).getTime() - new Date(delivery.pickupTime).getTime()) / (1000 * 60);
        }

        if (!zoneMap.has(gridKey)) {
          zoneMap.set(gridKey, { count: 0, totalEarnings: 0, totalTime: 0, validTime: 0 });
        }

        const zone = zoneMap.get(gridKey)!;
        zone.count++;
        zone.totalEarnings += earnings;
        if (timeMinutes > 0 && timeMinutes < 120) {
          zone.totalTime += timeMinutes;
          zone.validTime++;
        }
      }

      // Convert to array and calculate metrics
      const zones = Array.from(zoneMap.entries())
        .map(([gridKey, data]) => {
          const avgEarnings = data.count > 0 ? data.totalEarnings / data.count : 0;
          const avgTime = data.validTime > 0 ? data.totalTime / data.validTime : 25;
          const efficiency = avgTime > 0 ? (avgEarnings / avgTime) * 60 : 0; // $ per hour

          return {
            zone: gridKey,
            deliveryCount: data.count,
            avgEarnings: parseFloat(avgEarnings.toFixed(2)),
            efficiency: parseFloat(efficiency.toFixed(2)),
          };
        })
        .filter((z) => z.deliveryCount >= 3) // Only zones with 3+ deliveries
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, 5); // Top 5 zones

      return zones;
    } catch (error) {
      logger.error('Error calculating zone mastery:', error);
      return [];
    }
  }

  /**
   * Find driver's best performance times (hours of day)
   * @param driverId driver_profiles.id
   */
  async findBestPerformanceTimes(
    driverId: string
  ): Promise<Array<{ hour: number; deliveryCount: number; avgEarnings: number; speedScore: number }>> {
    try {
      const thirtyDaysAgo = this.getDateFilter('month');

      const deliveries = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.assignedDriverId, driverId),
            eq(orders.status, 'delivered'),
            gte(orders.deliveryTime, thirtyDaysAgo)
          )
        );

      // Group by hour of day
      const hourMap = new Map<number, { count: number; totalEarnings: number; totalTime: number; validTime: number }>();

      for (const delivery of deliveries) {
        if (!delivery.deliveryTime) continue;

        const hour = new Date(delivery.deliveryTime).getHours();
        const earnings = parseFloat(delivery.deliveryFee || '0');

        let timeMinutes = 0;
        if (delivery.pickupTime && delivery.deliveryTime) {
          timeMinutes = (new Date(delivery.deliveryTime).getTime() - new Date(delivery.pickupTime).getTime()) / (1000 * 60);
        }

        if (!hourMap.has(hour)) {
          hourMap.set(hour, { count: 0, totalEarnings: 0, totalTime: 0, validTime: 0 });
        }

        const hourData = hourMap.get(hour)!;
        hourData.count++;
        hourData.totalEarnings += earnings;
        if (timeMinutes > 0 && timeMinutes < 120) {
          hourData.totalTime += timeMinutes;
          hourData.validTime++;
        }
      }

      // Convert to array
      const hours = Array.from(hourMap.entries())
        .map(([hour, data]) => {
          const avgEarnings = data.count > 0 ? data.totalEarnings / data.count : 0;
          const avgTime = data.validTime > 0 ? data.totalTime / data.validTime : 25;
          const speedScore = avgTime > 0 ? Math.round((25 / avgTime) * 100) : 100;

          return {
            hour,
            deliveryCount: data.count,
            avgEarnings: parseFloat(avgEarnings.toFixed(2)),
            speedScore,
          };
        })
        .filter((h) => h.deliveryCount >= 2) // Only hours with 2+ deliveries
        .sort((a, b) => b.avgEarnings - a.avgEarnings);

      return hours;
    } catch (error) {
      logger.error('Error finding best performance times:', error);
      return [];
    }
  }

  /**
   * Generate personalized insights for driver
   */
  async generateInsights(driverId: string): Promise<DriverInsight[]> {
    try {
      const insights: DriverInsight[] = [];

      // 1. Speed analysis
      const speedData = await this.analyzeDriverSpeed(driverId, 'week');
      if (speedData.speedScore > 110) {
        insights.push({
          category: 'Speed',
          insight: `You're ${speedData.comparison.toLowerCase()}! Keep up the great work.`,
          impact: 'positive',
          actionable: false,
        });
      } else if (speedData.speedScore < 90) {
        insights.push({
          category: 'Speed',
          insight: `Your average delivery time is ${speedData.avgMinutesPerDelivery} min. Try optimizing your routes to save time.`,
          impact: 'negative',
          actionable: true,
        });
      }

      // 2. Zone mastery
      const zones = await this.calculateZoneMastery(driverId);
      if (zones.length > 0) {
        const bestZone = zones[0];
        insights.push({
          category: 'Zone Mastery',
          insight: `Your best area is ${bestZone.zone} with $${bestZone.efficiency}/hr efficiency. Focus on this zone!`,
          impact: 'positive',
          actionable: true,
        });
      }

      // 3. Best performance times
      const hours = await this.findBestPerformanceTimes(driverId);
      if (hours.length > 0) {
        const bestHours = hours.slice(0, 3).map((h) => this.formatHour(h.hour));
        insights.push({
          category: 'Peak Performance',
          insight: `You perform best during: ${bestHours.join(', ')}. Consider working these hours more.`,
          impact: 'positive',
          actionable: true,
        });
      }

      // 4. Earnings opportunity
      const thirtyDaysAgo = this.getDateFilter('month');
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const [earningsData] = await db
        .select()
        .from(driverEarningsHistory)
        .where(and(eq(driverEarningsHistory.driverId, driverId), gte(driverEarningsHistory.date, startDate)))
        .orderBy(sql`${driverEarningsHistory.date} DESC`)
        .limit(1);

      if (earningsData) {
        const avgPerDelivery = earningsData.deliveryCount > 0 ? parseFloat(earningsData.totalEarnings) / earningsData.deliveryCount : 0;
        if (avgPerDelivery < 8) {
          insights.push({
            category: 'Earnings',
            insight: 'Your average earnings per delivery is below $8. Try accepting higher-value orders during peak hours.',
            impact: 'negative',
            actionable: true,
          });
        }
      }

      return insights;
    } catch (error) {
      logger.error('Error generating insights:', error);
      return [];
    }
  }

  /**
   * Store behavior pattern in database
   */
  async storePattern(
    driverId: string,
    patternType: string,
    patternData: any,
    confidenceScore: number,
    sampleSize: number
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if pattern exists
      const [existing] = await db
        .select()
        .from(driverBehaviorPatterns)
        .where(
          and(
            eq(driverBehaviorPatterns.driverId, driverId),
            eq(driverBehaviorPatterns.patternType, patternType),
            eq(driverBehaviorPatterns.date, today)
          )
        )
        .limit(1);

      if (existing) {
        // Update
        await db
          .update(driverBehaviorPatterns)
          .set({
            patternData: JSON.stringify(patternData),
            confidenceScore: confidenceScore.toString(),
            sampleSize,
            updatedAt: new Date(),
          })
          .where(eq(driverBehaviorPatterns.id, existing.id));
      } else {
        // Insert
        await db.insert(driverBehaviorPatterns).values({
          driverId,
          patternType,
          patternData: JSON.stringify(patternData),
          confidenceScore: confidenceScore.toString(),
          sampleSize,
          date: today,
        });
      }
    } catch (error) {
      logger.error('Error storing behavior pattern:', error);
    }
  }

  // Helper methods

  private getDateFilter(period: 'day' | 'week' | 'month'): Date {
    const date = new Date();
    if (period === 'day') date.setDate(date.getDate() - 1);
    else if (period === 'week') date.setDate(date.getDate() - 7);
    else date.setDate(date.getDate() - 30);
    return date;
  }

  private getGridKey(lat: number, lng: number, precision: number = 0.05): string {
    const gridLat = Math.round(lat / precision) * precision;
    const gridLng = Math.round(lng / precision) * precision;
    return `${gridLat.toFixed(2)},${gridLng.toFixed(2)}`;
  }

  private formatHour(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}${period}`;
  }
}

export const driverBehaviorAnalysisService = new DriverBehaviorAnalysisService();
