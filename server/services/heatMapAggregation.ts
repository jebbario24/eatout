/**
 * Heat Map Aggregation Service
 * 
 * Aggregates delivery data into grid-based heat maps for:
 * - Delivery density (where orders happen)
 * - Earnings heat map (where money is made)
 * - Demand prediction (where to wait for orders)
 * - Time-based patterns (hourly/daily variations)
 */

import { db } from '../db';
import {
  deliveryHeatMapData,
  orders,
} from '../../shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import logger from '../logger';

interface HeatMapPoint {
  lat: number;
  lng: number;
  intensity: number; // 0-100
  deliveryCount: number;
  avgEarnings?: number;
}

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export class HeatMapAggregationService {
  // Grid resolution: ~111 meters per 0.001 degrees
  private readonly GRID_PRECISION = 3; // 3 decimal places

  /**
   * Round lat/lng to grid precision
   */
  private roundToGrid(value: number): string {
    return value.toFixed(this.GRID_PRECISION);
  }

  /**
   * Update heat map data after a delivery
   */
  async updateHeatMapData(delivery: {
    lat: number;
    lng: number;
    earnings: number;
    deliveryTimeMinutes: number;
    timestamp: Date;
  }): Promise<void> {
    try {
      const gridLat = this.roundToGrid(delivery.lat);
      const gridLng = this.roundToGrid(delivery.lng);
      const date = delivery.timestamp.toISOString().split('T')[0];
      const hourOfDay = delivery.timestamp.getHours();

      // Get existing data or create new
      const existing = await db
        .select()
        .from(deliveryHeatMapData)
        .where(
          and(
            eq(deliveryHeatMapData.gridLat, gridLat),
            eq(deliveryHeatMapData.gridLng, gridLng),
            eq(deliveryHeatMapData.date, date),
            eq(deliveryHeatMapData.hourOfDay, hourOfDay)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const data = existing[0];
        const newCount = data.deliveryCount + 1;
        const newTotalEarnings = parseFloat(data.totalEarnings) + delivery.earnings;
        const newAvgTime = Math.round(
          (data.avgDeliveryTimeMinutes * data.deliveryCount + delivery.deliveryTimeMinutes) / newCount
        );
        const newDemandScore = this.calculateDemandScore(newCount, newTotalEarnings, newAvgTime);

        await db
          .update(deliveryHeatMapData)
          .set({
            deliveryCount: newCount,
            totalEarnings: newTotalEarnings.toFixed(2),
            avgDeliveryTimeMinutes: newAvgTime,
            demandScore: newDemandScore.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(deliveryHeatMapData.id, data.id));
      } else {
        const demandScore = this.calculateDemandScore(1, delivery.earnings, delivery.deliveryTimeMinutes);

        await db.insert(deliveryHeatMapData).values({
          gridLat,
          gridLng,
          date,
          hourOfDay,
          deliveryCount: 1,
          totalEarnings: delivery.earnings.toFixed(2),
          avgDeliveryTimeMinutes: delivery.deliveryTimeMinutes,
          demandScore: demandScore.toFixed(2),
        });
      }

      logger.info(`Updated heat map data for grid (${gridLat}, ${gridLng}) at hour ${hourOfDay}`);
    } catch (error) {
      logger.error('Error updating heat map data:', error);
      throw error;
    }
  }

  /**
   * Calculate demand score (0-100) based on delivery count, earnings, and time
   */
  private calculateDemandScore(deliveryCount: number, totalEarnings: number, avgTimeMinutes: number): number {
    // Weighted formula:
    // - 50% based on delivery count (normalized to 10 deliveries = 50 points)
    // - 30% based on earnings (normalized to $100 = 30 points)
    // - 20% based on speed (faster = better, normalized to 20 min = 20 points)

    const countScore = Math.min((deliveryCount / 10) * 50, 50);
    const earningsScore = Math.min((totalEarnings / 100) * 30, 30);
    const speedScore = avgTimeMinutes > 0 ? Math.max(20 - (avgTimeMinutes / 20) * 10, 0) : 0;

    return Math.min(countScore + earningsScore + speedScore, 100);
  }

  /**
   * Get delivery heat map for a specific area and time
   */
  async getDeliveryHeatMap(
    bounds: Bounds,
    date?: string,
    hourOfDay?: number
  ): Promise<HeatMapPoint[]> {
    try {
      const query = db
        .select()
        .from(deliveryHeatMapData)
        .where(
          and(
            gte(sql`CAST(${deliveryHeatMapData.gridLat} AS DECIMAL)`, bounds.south),
            lte(sql`CAST(${deliveryHeatMapData.gridLat} AS DECIMAL)`, bounds.north),
            gte(sql`CAST(${deliveryHeatMapData.gridLng} AS DECIMAL)`, bounds.west),
            lte(sql`CAST(${deliveryHeatMapData.gridLng} AS DECIMAL)`, bounds.east),
            date ? eq(deliveryHeatMapData.date, date) : undefined,
            hourOfDay !== undefined ? eq(deliveryHeatMapData.hourOfDay, hourOfDay) : undefined
          )
        );

      const results = await query;

      return results.map(r => ({
        lat: parseFloat(r.gridLat),
        lng: parseFloat(r.gridLng),
        intensity: parseFloat(r.demandScore),
        deliveryCount: r.deliveryCount,
      }));
    } catch (error) {
      logger.error('Error getting delivery heat map:', error);
      throw error;
    }
  }

  /**
   * Get earnings heat map
   */
  async getEarningsHeatMap(
    bounds: Bounds,
    date?: string,
    hourOfDay?: number
  ): Promise<HeatMapPoint[]> {
    try {
      const query = db
        .select()
        .from(deliveryHeatMapData)
        .where(
          and(
            gte(sql`CAST(${deliveryHeatMapData.gridLat} AS DECIMAL)`, bounds.south),
            lte(sql`CAST(${deliveryHeatMapData.gridLat} AS DECIMAL)`, bounds.north),
            gte(sql`CAST(${deliveryHeatMapData.gridLng} AS DECIMAL)`, bounds.west),
            lte(sql`CAST(${deliveryHeatMapData.gridLng} AS DECIMAL)`, bounds.east),
            date ? eq(deliveryHeatMapData.date, date) : undefined,
            hourOfDay !== undefined ? eq(deliveryHeatMapData.hourOfDay, hourOfDay) : undefined
          )
        );

      const results = await query;

      // Normalize intensity based on earnings
      const maxEarnings = Math.max(...results.map(r => parseFloat(r.totalEarnings)), 1);

      return results.map(r => {
        const earnings = parseFloat(r.totalEarnings);
        return {
          lat: parseFloat(r.gridLat),
          lng: parseFloat(r.gridLng),
          intensity: (earnings / maxEarnings) * 100,
          deliveryCount: r.deliveryCount,
          avgEarnings: r.deliveryCount > 0 ? earnings / r.deliveryCount : 0,
        };
      });
    } catch (error) {
      logger.error('Error getting earnings heat map:', error);
      throw error;
    }
  }

  /**
   * Get demand prediction heat map for upcoming hour
   */
  async getDemandPredictionHeatMap(
    bounds: Bounds,
    targetHour: number
  ): Promise<HeatMapPoint[]> {
    try {
      // Get historical data for this hour across last 7 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const startDateStr = startDate.toISOString().split('T')[0];

      const results = await db
        .select()
        .from(deliveryHeatMapData)
        .where(
          and(
            gte(sql`CAST(${deliveryHeatMapData.gridLat} AS DECIMAL)`, bounds.south),
            lte(sql`CAST(${deliveryHeatMapData.gridLat} AS DECIMAL)`, bounds.north),
            gte(sql`CAST(${deliveryHeatMapData.gridLng} AS DECIMAL)`, bounds.west),
            lte(sql`CAST(${deliveryHeatMapData.gridLng} AS DECIMAL)`, bounds.east),
            eq(deliveryHeatMapData.hourOfDay, targetHour),
            gte(deliveryHeatMapData.date, startDateStr),
            lte(deliveryHeatMapData.date, endDate)
          )
        );

      // Aggregate by grid cell
      const gridMap = new Map<string, { count: number; totalDemand: number }>();

      results.forEach(r => {
        const key = `${r.gridLat},${r.gridLng}`;
        const existing = gridMap.get(key) || { count: 0, totalDemand: 0 };
        gridMap.set(key, {
          count: existing.count + 1,
          totalDemand: existing.totalDemand + parseFloat(r.demandScore),
        });
      });

      // Convert to heat map points
      const points: HeatMapPoint[] = [];
      gridMap.forEach((value, key) => {
        const [lat, lng] = key.split(',').map(parseFloat);
        const avgDemand = value.totalDemand / value.count;
        points.push({
          lat,
          lng,
          intensity: avgDemand,
          deliveryCount: value.count, // Sample count
        });
      });

      return points;
    } catch (error) {
      logger.error('Error getting demand prediction heat map:', error);
      throw error;
    }
  }

  /**
   * Detect hotspots (high-demand areas)
   */
  async calculateHotspots(
    bounds: Bounds,
    threshold: number = 70 // Demand score threshold
  ): Promise<HeatMapPoint[]> {
    try {
      // Get current hour
      const currentHour = new Date().getHours();
      const today = new Date().toISOString().split('T')[0];

      const results = await db
        .select()
        .from(deliveryHeatMapData)
        .where(
          and(
            gte(sql`CAST(${deliveryHeatMapData.gridLat} AS DECIMAL)`, bounds.south),
            lte(sql`CAST(${deliveryHeatMapData.gridLat} AS DECIMAL)`, bounds.north),
            gte(sql`CAST(${deliveryHeatMapData.gridLng} AS DECIMAL)`, bounds.west),
            lte(sql`CAST(${deliveryHeatMapData.gridLng} AS DECIMAL)`, bounds.east),
            eq(deliveryHeatMapData.date, today),
            eq(deliveryHeatMapData.hourOfDay, currentHour),
            gte(sql`CAST(${deliveryHeatMapData.demandScore} AS DECIMAL)`, threshold)
          )
        );

      return results.map(r => ({
        lat: parseFloat(r.gridLat),
        lng: parseFloat(r.gridLng),
        intensity: parseFloat(r.demandScore),
        deliveryCount: r.deliveryCount,
      }));
    } catch (error) {
      logger.error('Error calculating hotspots:', error);
      throw error;
    }
  }

  /**
   * Get aggregated data for a specific grid cell
   */
  async getGridCellData(
    lat: number,
    lng: number,
    days: number = 7
  ): Promise<{
    totalDeliveries: number;
    totalEarnings: number;
    avgDemandScore: number;
    peakHours: number[];
  }> {
    try {
      const gridLat = this.roundToGrid(lat);
      const gridLng = this.roundToGrid(lng);
      
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const results = await db
        .select()
        .from(deliveryHeatMapData)
        .where(
          and(
            eq(deliveryHeatMapData.gridLat, gridLat),
            eq(deliveryHeatMapData.gridLng, gridLng),
            gte(deliveryHeatMapData.date, startDateStr),
            lte(deliveryHeatMapData.date, endDate)
          )
        );

      if (results.length === 0) {
        return {
          totalDeliveries: 0,
          totalEarnings: 0,
          avgDemandScore: 0,
          peakHours: [],
        };
      }

      const totalDeliveries = results.reduce((sum, r) => sum + r.deliveryCount, 0);
      const totalEarnings = results.reduce((sum, r) => sum + parseFloat(r.totalEarnings), 0);
      const avgDemandScore = results.reduce((sum, r) => sum + parseFloat(r.demandScore), 0) / results.length;

      // Find peak hours (top 3 hours by delivery count)
      const hourlyData = new Map<number, number>();
      results.forEach(r => {
        const existing = hourlyData.get(r.hourOfDay) || 0;
        hourlyData.set(r.hourOfDay, existing + r.deliveryCount);
      });

      const peakHours = Array.from(hourlyData.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => hour);

      return {
        totalDeliveries,
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        avgDemandScore: parseFloat(avgDemandScore.toFixed(2)),
        peakHours,
      };
    } catch (error) {
      logger.error('Error getting grid cell data:', error);
      throw error;
    }
  }
}

export const heatMapAggregationService = new HeatMapAggregationService();
