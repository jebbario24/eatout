/**
 * Earnings Analytics Service
 * 
 * Provides comprehensive earnings analytics for drivers including:
 * - Daily/weekly/monthly aggregations
 * - Earnings trends and forecasts
 * - Earnings by time of day
 * - Earnings by zone
 * - Top earning hours and zones
 */

import { db } from '../db';
import {
  driverEarningsHistory,
  driverTimeSlots,
  orders,
  deliveryZones,
} from '../../shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import logger from '../logger';

interface EarningsSummary {
  totalEarnings: number;
  deliveryCount: number;
  avgEarningsPerDelivery: number;
  avgEarningsPerKm: number;
  totalDistanceKm: number;
  tipsAmount: number;
  basePayAmount: number;
  bonusesAmount: number;
}

interface EarningsTrend {
  date: string;
  totalEarnings: number;
  deliveryCount: number;
}

interface TimeSlotEarnings {
  hourOfDay: number;
  dayOfWeek: number;
  avgEarningsPerHour: number;
  totalDeliveries: number;
  sampleCount: number;
}

interface ZoneEarnings {
  zoneId: string;
  zoneName: string;
  totalEarnings: number;
  deliveryCount: number;
  avgEarningsPerDelivery: number;
}

export class EarningsAnalyticsService {
  /**
   * Aggregate daily earnings for a driver
   * Should be called at end of each day or after each delivery
   * @param driverId driver_profiles.id
   */
  async aggregateDailyEarnings(driverId: string, date: string): Promise<void> {
    try {
      // Get all completed deliveries for the date
      const deliveries = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.assignedDriverId, driverId),
            eq(orders.status, 'delivered'),
            sql`DATE(${orders.deliveryTime}) = ${date}`
          )
        );

      if (deliveries.length === 0) {
        logger.info(`No deliveries for driver ${driverId} on ${date}`);
        return;
      }

      // Calculate aggregates
      const totalEarnings = deliveries.reduce((sum, d) => sum + parseFloat(d.deliveryFee || '0'), 0);
      const deliveryCount = deliveries.length;
      const totalDistanceKm = deliveries.reduce((sum, d) => {
        // Calculate distance from restaurant to customer (simplified)
        // In production, use actual tracked distance from GPS
        return sum + 5; // Placeholder: 5km per delivery
      }, 0);
      const totalDurationMinutes = deliveries.reduce((sum, d) => {
        if (!d.pickupTime || !d.deliveryTime) return sum;
        const duration = (new Date(d.deliveryTime).getTime() - new Date(d.pickupTime).getTime()) / 60000;
        return sum + duration;
      }, 0);

      // No per-order tipping field exists yet; driver earnings are entirely base pay for now
      const tipsAmount = 0;
      const basePayAmount = totalEarnings - tipsAmount;
      const bonusesAmount = 0; // TODO: Implement bonus logic
      const avgEarningsPerDelivery = deliveryCount > 0 ? totalEarnings / deliveryCount : 0;
      const avgEarningsPerKm = totalDistanceKm > 0 ? totalEarnings / totalDistanceKm : 0;

      // Upsert earnings history
      await db
        .insert(driverEarningsHistory)
        .values({
          driverId,
          date,
          totalEarnings: totalEarnings.toFixed(2),
          deliveryCount,
          totalDistanceKm: totalDistanceKm.toFixed(2),
          totalDurationMinutes: Math.round(totalDurationMinutes),
          tipsAmount: tipsAmount.toFixed(2),
          basePayAmount: basePayAmount.toFixed(2),
          bonusesAmount: bonusesAmount.toFixed(2),
          avgEarningsPerDelivery: avgEarningsPerDelivery.toFixed(2),
          avgEarningsPerKm: avgEarningsPerKm.toFixed(2),
        })
        .onConflictDoUpdate({
          target: [driverEarningsHistory.driverId, driverEarningsHistory.date],
          set: {
            totalEarnings: totalEarnings.toFixed(2),
            deliveryCount,
            totalDistanceKm: totalDistanceKm.toFixed(2),
            totalDurationMinutes: Math.round(totalDurationMinutes),
            tipsAmount: tipsAmount.toFixed(2),
            basePayAmount: basePayAmount.toFixed(2),
            bonusesAmount: bonusesAmount.toFixed(2),
            avgEarningsPerDelivery: avgEarningsPerDelivery.toFixed(2),
            avgEarningsPerKm: avgEarningsPerKm.toFixed(2),
          },
        });

      logger.info(`Aggregated earnings for driver ${driverId} on ${date}: $${totalEarnings.toFixed(2)}`);
    } catch (error) {
      logger.error('Error aggregating daily earnings:', error);
      throw error;
    }
  }

  /**
   * Get earnings summary for a date range
   */
  async getEarningsSummary(
    driverId: string,
    startDate: string,
    endDate: string
  ): Promise<EarningsSummary> {
    try {
      const records = await db
        .select()
        .from(driverEarningsHistory)
        .where(
          and(
            eq(driverEarningsHistory.driverId, driverId),
            gte(driverEarningsHistory.date, startDate),
            lte(driverEarningsHistory.date, endDate)
          )
        );

      if (records.length === 0) {
        return {
          totalEarnings: 0,
          deliveryCount: 0,
          avgEarningsPerDelivery: 0,
          avgEarningsPerKm: 0,
          totalDistanceKm: 0,
          tipsAmount: 0,
          basePayAmount: 0,
          bonusesAmount: 0,
        };
      }

      const totalEarnings = records.reduce((sum, r) => sum + parseFloat(r.totalEarnings), 0);
      const deliveryCount = records.reduce((sum, r) => sum + r.deliveryCount, 0);
      const totalDistanceKm = records.reduce((sum, r) => sum + parseFloat(r.totalDistanceKm), 0);
      const tipsAmount = records.reduce((sum, r) => sum + parseFloat(r.tipsAmount), 0);
      const basePayAmount = records.reduce((sum, r) => sum + parseFloat(r.basePayAmount), 0);
      const bonusesAmount = records.reduce((sum, r) => sum + parseFloat(r.bonusesAmount), 0);

      return {
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        deliveryCount,
        avgEarningsPerDelivery: deliveryCount > 0 ? parseFloat((totalEarnings / deliveryCount).toFixed(2)) : 0,
        avgEarningsPerKm: totalDistanceKm > 0 ? parseFloat((totalEarnings / totalDistanceKm).toFixed(2)) : 0,
        totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
        tipsAmount: parseFloat(tipsAmount.toFixed(2)),
        basePayAmount: parseFloat(basePayAmount.toFixed(2)),
        bonusesAmount: parseFloat(bonusesAmount.toFixed(2)),
      };
    } catch (error) {
      logger.error('Error getting earnings summary:', error);
      throw error;
    }
  }

  /**
   * Get earnings trend (daily breakdown)
   */
  async getEarningsTrend(
    driverId: string,
    period: 'week' | 'month' | 'year'
  ): Promise<EarningsTrend[]> {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      let startDate: string;

      switch (period) {
        case 'week':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString().split('T')[0];
          break;
        case 'month':
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = monthAgo.toISOString().split('T')[0];
          break;
        case 'year':
          const yearAgo = new Date();
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          startDate = yearAgo.toISOString().split('T')[0];
          break;
      }

      const records = await db
        .select()
        .from(driverEarningsHistory)
        .where(
          and(
            eq(driverEarningsHistory.driverId, driverId),
            gte(driverEarningsHistory.date, startDate),
            lte(driverEarningsHistory.date, endDate)
          )
        )
        .orderBy(driverEarningsHistory.date);

      return records.map(r => ({
        date: r.date,
        totalEarnings: parseFloat(r.totalEarnings),
        deliveryCount: r.deliveryCount,
      }));
    } catch (error) {
      logger.error('Error getting earnings trend:', error);
      throw error;
    }
  }

  /**
   * Get earnings by time of day (best hours to work)
   */
  async getEarningsByTimeOfDay(driverId: string): Promise<TimeSlotEarnings[]> {
    try {
      const slots = await db
        .select()
        .from(driverTimeSlots)
        .where(eq(driverTimeSlots.driverId, driverId))
        .orderBy(driverTimeSlots.dayOfWeek, driverTimeSlots.hourOfDay);

      return slots.map(s => ({
        hourOfDay: s.hourOfDay,
        dayOfWeek: s.dayOfWeek,
        avgEarningsPerHour: parseFloat(s.avgEarningsPerHour),
        totalDeliveries: s.totalDeliveries,
        sampleCount: s.sampleCount,
      }));
    } catch (error) {
      logger.error('Error getting earnings by time of day:', error);
      throw error;
    }
  }

  /**
   * Get top earning hours (best times to work)
   */
  async getTopEarningHours(driverId: string, limit: number = 5): Promise<TimeSlotEarnings[]> {
    try {
      const slots = await db
        .select()
        .from(driverTimeSlots)
        .where(eq(driverTimeSlots.driverId, driverId))
        .orderBy(desc(sql`CAST(${driverTimeSlots.avgEarningsPerHour} AS DECIMAL)`))
        .limit(limit);

      return slots.map(s => ({
        hourOfDay: s.hourOfDay,
        dayOfWeek: s.dayOfWeek,
        avgEarningsPerHour: parseFloat(s.avgEarningsPerHour),
        totalDeliveries: s.totalDeliveries,
        sampleCount: s.sampleCount,
      }));
    } catch (error) {
      logger.error('Error getting top earning hours:', error);
      throw error;
    }
  }

  /**
   * Update time slot earnings after a delivery
   */
  async updateTimeSlotEarnings(
    driverId: string,
    deliveryDate: Date,
    earnings: number,
    durationMinutes: number
  ): Promise<void> {
    try {
      const dayOfWeek = deliveryDate.getDay(); // 0=Sunday, 6=Saturday
      const hourOfDay = deliveryDate.getHours();

      // Get existing slot or create new
      const existing = await db
        .select()
        .from(driverTimeSlots)
        .where(
          and(
            eq(driverTimeSlots.driverId, driverId),
            eq(driverTimeSlots.dayOfWeek, dayOfWeek),
            eq(driverTimeSlots.hourOfDay, hourOfDay)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const slot = existing[0];
        const newTotalDeliveries = slot.totalDeliveries + 1;
        const newTotalEarnings = parseFloat(slot.totalEarnings) + earnings;
        const newAvgEarningsPerHour = newTotalEarnings / newTotalDeliveries;

        await db
          .update(driverTimeSlots)
          .set({
            totalDeliveries: newTotalDeliveries,
            totalEarnings: newTotalEarnings.toFixed(2),
            avgEarningsPerHour: newAvgEarningsPerHour.toFixed(2),
            sampleCount: slot.sampleCount + 1,
            updatedAt: new Date(),
          })
          .where(eq(driverTimeSlots.id, slot.id));
      } else {
        await db.insert(driverTimeSlots).values({
          driverId,
          dayOfWeek,
          hourOfDay,
          totalDeliveries: 1,
          totalEarnings: earnings.toFixed(2),
          avgEarningsPerHour: earnings.toFixed(2),
          sampleCount: 1,
        });
      }
    } catch (error) {
      logger.error('Error updating time slot earnings:', error);
      throw error;
    }
  }

  /**
   * Calculate earnings forecast for next period
   */
  async calculateEarningsForecast(driverId: string, daysAhead: number = 7): Promise<{
    forecastEarnings: number;
    confidenceLevel: string;
    basedOnDays: number;
  }> {
    try {
      // Get last 30 days of data
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const startDateStr = startDate.toISOString().split('T')[0];

      const records = await db
        .select()
        .from(driverEarningsHistory)
        .where(
          and(
            eq(driverEarningsHistory.driverId, driverId),
            gte(driverEarningsHistory.date, startDateStr),
            lte(driverEarningsHistory.date, endDate)
          )
        );

      if (records.length < 3) {
        return {
          forecastEarnings: 0,
          confidenceLevel: 'insufficient_data',
          basedOnDays: records.length,
        };
      }

      // Simple average-based forecast
      const avgDailyEarnings = records.reduce((sum, r) => sum + parseFloat(r.totalEarnings), 0) / records.length;
      const forecastEarnings = avgDailyEarnings * daysAhead;

      let confidenceLevel = 'low';
      if (records.length >= 20) confidenceLevel = 'high';
      else if (records.length >= 10) confidenceLevel = 'medium';

      return {
        forecastEarnings: parseFloat(forecastEarnings.toFixed(2)),
        confidenceLevel,
        basedOnDays: records.length,
      };
    } catch (error) {
      logger.error('Error calculating earnings forecast:', error);
      throw error;
    }
  }
}

export const earningsAnalyticsService = new EarningsAnalyticsService();
