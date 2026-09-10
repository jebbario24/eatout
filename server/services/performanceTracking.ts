/**
 * Performance Tracking Service
 * 
 * Tracks driver performance metrics including:
 * - Acceptance rate
 * - On-time delivery rate
 * - Efficiency score (deliveries per hour)
 * - Customer ratings
 * - Performance trends
 */

import { db } from '../db';
import {
  driverPerformanceMetrics,
  orders,
  dispatchAssignments,
  customerReviews,
} from '../../shared/schema';
import { eq, and, gte, lte, sql, desc, inArray } from 'drizzle-orm';
import logger from '../logger';

interface PerformanceSummary {
  acceptanceRate: number;
  onTimeRate: number;
  efficiencyScore: number;
  avgCustomerRating: number;
  totalDeliveries: number;
  lateDeliveries: number;
}

interface PerformanceTrend {
  date: string;
  acceptanceRate: number;
  onTimeRate: number;
  efficiencyScore: number;
  deliveriesCompleted: number;
}

export class PerformanceTrackingService {
  /**
   * Calculate and store daily performance metrics
   * @param driverId driver_profiles.id
   */
  async calculateDailyPerformance(driverId: string, date: string): Promise<void> {
    try {
      // Get all deliveries for the date
      const deliveries = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.assignedDriverId, driverId),
            sql`DATE(${orders.deliveryTime}) = ${date}`
          )
        );

      // Get all assignments for the date
      const assignments = await db
        .select()
        .from(dispatchAssignments)
        .where(
          and(
            eq(dispatchAssignments.driverId, driverId),
            sql`DATE(${dispatchAssignments.assignedAt}) = ${date}`
          )
        );

      const deliveriesCompleted = deliveries.filter(d => d.status === 'delivered').length;
      const deliveriesAccepted = assignments.filter(a => a.status === 'accepted' || a.status === 'completed').length;
      const deliveriesRejected = assignments.filter(a => a.status === 'rejected').length;

      const acceptanceRate = (deliveriesAccepted + deliveriesRejected) > 0
        ? (deliveriesAccepted / (deliveriesAccepted + deliveriesRejected)) * 100
        : 0;

      // Calculate on-time deliveries
      let onTimeDeliveries = 0;
      let lateDeliveries = 0;

      deliveries.forEach(d => {
        if (!d.deliveryTime || !d.estimatedDeliveryTime) return;

        const deliveredTime = new Date(d.deliveryTime).getTime();
        const estimatedTime = new Date(d.estimatedDeliveryTime).getTime();
        
        if (deliveredTime <= estimatedTime) {
          onTimeDeliveries++;
        } else {
          lateDeliveries++;
        }
      });

      const onTimeRate = (onTimeDeliveries + lateDeliveries) > 0
        ? (onTimeDeliveries / (onTimeDeliveries + lateDeliveries)) * 100
        : 0;

      // Calculate average delivery time
      let totalDeliveryTime = 0;
      let deliveryCount = 0;

      deliveries.forEach(d => {
        if (!d.pickupTime || !d.deliveryTime) return;
        const duration = (new Date(d.deliveryTime).getTime() - new Date(d.pickupTime).getTime()) / 60000;
        totalDeliveryTime += duration;
        deliveryCount++;
      });

      const avgDeliveryTimeMinutes = deliveryCount > 0 ? Math.round(totalDeliveryTime / deliveryCount) : 0;

      // Calculate customer rating from reviews left on this driver's orders for the day
      const deliveryOrderIds = deliveries.map(d => d.id);
      const reviews = deliveryOrderIds.length > 0
        ? await db
            .select({ rating: customerReviews.rating })
            .from(customerReviews)
            .where(inArray(customerReviews.orderId, deliveryOrderIds))
        : [];
      const avgCustomerRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      // Calculate efficiency score (deliveries per hour)
      // Simplified: assume 8-hour workday if deliveries exist
      const workHours = deliveriesCompleted > 0 ? 8 : 0;
      const efficiencyScore = workHours > 0 ? deliveriesCompleted / workHours : 0;

      // Upsert performance metrics
      await db
        .insert(driverPerformanceMetrics)
        .values({
          driverId,
          date,
          deliveriesCompleted,
          deliveriesAccepted,
          deliveriesRejected,
          acceptanceRate: acceptanceRate.toFixed(2),
          onTimeDeliveries,
          lateDeliveries,
          onTimeRate: onTimeRate.toFixed(2),
          avgDeliveryTimeMinutes,
          avgCustomerRating: avgCustomerRating.toFixed(2),
          efficiencyScore: efficiencyScore.toFixed(2),
        })
        .onConflictDoUpdate({
          target: [driverPerformanceMetrics.driverId, driverPerformanceMetrics.date],
          set: {
            deliveriesCompleted,
            deliveriesAccepted,
            deliveriesRejected,
            acceptanceRate: acceptanceRate.toFixed(2),
            onTimeDeliveries,
            lateDeliveries,
            onTimeRate: onTimeRate.toFixed(2),
            avgDeliveryTimeMinutes,
            avgCustomerRating: avgCustomerRating.toFixed(2),
            efficiencyScore: efficiencyScore.toFixed(2),
            updatedAt: new Date(),
          },
        });

      logger.info(`Updated performance metrics for driver ${driverId} on ${date}`);
    } catch (error) {
      logger.error('Error calculating daily performance:', error);
      throw error;
    }
  }

  /**
   * Get performance summary for a date range
   */
  async getPerformanceSummary(
    driverId: string,
    startDate: string,
    endDate: string
  ): Promise<PerformanceSummary> {
    try {
      const records = await db
        .select()
        .from(driverPerformanceMetrics)
        .where(
          and(
            eq(driverPerformanceMetrics.driverId, driverId),
            gte(driverPerformanceMetrics.date, startDate),
            lte(driverPerformanceMetrics.date, endDate)
          )
        );

      if (records.length === 0) {
        return {
          acceptanceRate: 0,
          onTimeRate: 0,
          efficiencyScore: 0,
          avgCustomerRating: 0,
          totalDeliveries: 0,
          lateDeliveries: 0,
        };
      }

      const totalAccepted = records.reduce((sum, r) => sum + r.deliveriesAccepted, 0);
      const totalRejected = records.reduce((sum, r) => sum + r.deliveriesRejected, 0);
      const totalOnTime = records.reduce((sum, r) => sum + r.onTimeDeliveries, 0);
      const totalLate = records.reduce((sum, r) => sum + r.lateDeliveries, 0);
      const totalDeliveries = records.reduce((sum, r) => sum + r.deliveriesCompleted, 0);
      const totalRating = records.reduce((sum, r) => sum + parseFloat(r.avgCustomerRating), 0);
      const avgEfficiency = records.reduce((sum, r) => sum + parseFloat(r.efficiencyScore), 0) / records.length;

      const acceptanceRate = (totalAccepted + totalRejected) > 0
        ? (totalAccepted / (totalAccepted + totalRejected)) * 100
        : 0;

      const onTimeRate = (totalOnTime + totalLate) > 0
        ? (totalOnTime / (totalOnTime + totalLate)) * 100
        : 0;

      const avgCustomerRating = records.length > 0 ? totalRating / records.length : 0;

      return {
        acceptanceRate: parseFloat(acceptanceRate.toFixed(2)),
        onTimeRate: parseFloat(onTimeRate.toFixed(2)),
        efficiencyScore: parseFloat(avgEfficiency.toFixed(2)),
        avgCustomerRating: parseFloat(avgCustomerRating.toFixed(2)),
        totalDeliveries,
        lateDeliveries: totalLate,
      };
    } catch (error) {
      logger.error('Error getting performance summary:', error);
      throw error;
    }
  }

  /**
   * Get performance trend (daily breakdown)
   */
  async getPerformanceTrend(
    driverId: string,
    period: 'week' | 'month' | 'year'
  ): Promise<PerformanceTrend[]> {
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
        .from(driverPerformanceMetrics)
        .where(
          and(
            eq(driverPerformanceMetrics.driverId, driverId),
            gte(driverPerformanceMetrics.date, startDate),
            lte(driverPerformanceMetrics.date, endDate)
          )
        )
        .orderBy(driverPerformanceMetrics.date);

      return records.map(r => ({
        date: r.date,
        acceptanceRate: parseFloat(r.acceptanceRate),
        onTimeRate: parseFloat(r.onTimeRate),
        efficiencyScore: parseFloat(r.efficiencyScore),
        deliveriesCompleted: r.deliveriesCompleted,
      }));
    } catch (error) {
      logger.error('Error getting performance trend:', error);
      throw error;
    }
  }

  /**
   * Calculate efficiency score (deliveries per hour)
   */
  calculateEfficiencyScore(deliveries: number, hoursWorked: number): number {
    if (hoursWorked === 0) return 0;
    return parseFloat((deliveries / hoursWorked).toFixed(2));
  }

  /**
   * Get acceptance rate history
   */
  async getAcceptanceRateHistory(
    driverId: string,
    days: number = 30
  ): Promise<{ date: string; rate: number }[]> {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const records = await db
        .select()
        .from(driverPerformanceMetrics)
        .where(
          and(
            eq(driverPerformanceMetrics.driverId, driverId),
            gte(driverPerformanceMetrics.date, startDateStr),
            lte(driverPerformanceMetrics.date, endDate)
          )
        )
        .orderBy(driverPerformanceMetrics.date);

      return records.map(r => ({
        date: r.date,
        rate: parseFloat(r.acceptanceRate),
      }));
    } catch (error) {
      logger.error('Error getting acceptance rate history:', error);
      throw error;
    }
  }

  /**
   * Get on-time delivery rate for date range
   */
  async getOnTimeDeliveryRate(
    driverId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    try {
      const records = await db
        .select()
        .from(driverPerformanceMetrics)
        .where(
          and(
            eq(driverPerformanceMetrics.driverId, driverId),
            gte(driverPerformanceMetrics.date, startDate),
            lte(driverPerformanceMetrics.date, endDate)
          )
        );

      if (records.length === 0) return 0;

      const totalOnTime = records.reduce((sum, r) => sum + r.onTimeDeliveries, 0);
      const totalLate = records.reduce((sum, r) => sum + r.lateDeliveries, 0);

      if (totalOnTime + totalLate === 0) return 0;

      return parseFloat(((totalOnTime / (totalOnTime + totalLate)) * 100).toFixed(2));
    } catch (error) {
      logger.error('Error getting on-time delivery rate:', error);
      throw error;
    }
  }
}

export const performanceTrackingService = new PerformanceTrackingService();
