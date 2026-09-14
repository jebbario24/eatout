/**
 * Prep Time Prediction Service
 * 
 * Rule-based system to predict merchant food preparation time.
 * Factors considered:
 * - Historical average by merchant
 * - Time of day (lunch/dinner rush slower)
 * - Day of week patterns
 * - Order complexity (item count, special instructions)
 * 
 * ML-ready: Collects actual vs predicted for future model training
 */

import { db } from '../db';
import { prepTimeHistory, orders, merchants } from '../../shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import logger from '../logger';

interface PrepTimePrediction {
  predictedMinutes: number;
  confidence: number; // 0-100
  factors: {
    baseTime: number;
    timeOfDayMultiplier: number;
    complexityMultiplier: number;
    dayOfWeekMultiplier: number;
  };
}

export class PrepTimePredictionService {
  // Default prep times by meal type (minutes)
  private readonly DEFAULT_PREP_TIMES = {
    breakfast: 15,
    lunch: 20,
    dinner: 25,
    snack: 10,
  };

  /**
   * Predict prep time for a new order
   */
  async predictPrepTime(
    merchantId: string,
    orderDetails: {
      itemCount: number;
      orderValue: string;
      hasSpecialInstructions?: boolean;
    }
  ): Promise<PrepTimePrediction> {
    try {
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();

      // 1. Get merchant's historical average
      const baseTime = await this.getMerchantBaseTime(merchantId, hour);

      // 2. Apply time-of-day multiplier (rush hours slower)
      const timeMultiplier = this.getTimeOfDayMultiplier(hour);

      // 3. Apply order complexity multiplier
      const complexityMultiplier = this.getComplexityMultiplier(
        orderDetails.itemCount,
        parseFloat(orderDetails.orderValue),
        orderDetails.hasSpecialInstructions
      );

      // 4. Apply day of week multiplier
      const dayMultiplier = this.getDayOfWeekMultiplier(dayOfWeek);

      // Calculate final prediction
      const predictedMinutes = Math.round(baseTime * timeMultiplier * complexityMultiplier * dayMultiplier);

      // Confidence based on historical data volume
      const confidence = await this.calculateConfidence(merchantId);

      return {
        predictedMinutes: Math.max(5, Math.min(predictedMinutes, 60)), // Clamp 5-60 min
        confidence,
        factors: {
          baseTime,
          timeOfDayMultiplier: timeMultiplier,
          complexityMultiplier,
          dayOfWeekMultiplier: dayMultiplier,
        },
      };
    } catch (error) {
      logger.error('Error predicting prep time:', error);
      // Fallback to safe default
      return {
        predictedMinutes: 20,
        confidence: 30,
        factors: {
          baseTime: 20,
          timeOfDayMultiplier: 1.0,
          complexityMultiplier: 1.0,
          dayOfWeekMultiplier: 1.0,
        },
      };
    }
  }

  /**
   * Record actual prep time for learning
   */
  async recordActualPrepTime(orderId: string, readyTime: Date): Promise<void> {
    try {
      // Get order details
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

      if (!order || !order.createdAt || !order.merchantId) {
        logger.warn(`Cannot record prep time: incomplete order data for ${orderId}`);
        return;
      }

      const orderedAt = new Date(order.createdAt);
      const actualMinutes = Math.round((readyTime.getTime() - orderedAt.getTime()) / (1000 * 60));

      // Get the prediction we made (if any)
      const [existing] = await db
        .select()
        .from(prepTimeHistory)
        .where(eq(prepTimeHistory.orderId, orderId))
        .limit(1);

      if (existing) {
        // Update with actual time
        const errorMinutes = actualMinutes - existing.predictedPrepMinutes;
        await db
          .update(prepTimeHistory)
          .set({
            readyAt: readyTime,
            actualPrepMinutes: actualMinutes,
            predictionErrorMinutes: errorMinutes,
          })
          .where(eq(prepTimeHistory.id, existing.id));

        logger.info(
          `Recorded prep time for order ${orderId}: predicted ${existing.predictedPrepMinutes}min, actual ${actualMinutes}min (error: ${errorMinutes}min)`
        );
      } else {
        // No prediction was made, just record actual
        await db.insert(prepTimeHistory).values({
          merchantId: order.merchantId,
          orderId,
          orderedAt,
          readyAt: readyTime,
          actualPrepMinutes: actualMinutes,
          predictedPrepMinutes: actualMinutes, // Set same as actual
          predictionErrorMinutes: 0,
          itemCount: 1, // Unknown
          orderValue: order.total,
          hourOfDay: orderedAt.getHours(),
          dayOfWeek: orderedAt.getDay(),
        });
      }
    } catch (error) {
      logger.error('Error recording actual prep time:', error);
    }
  }

  /**
   * Save initial prediction when order is placed
   */
  async savePrediction(
    orderId: string,
    merchantId: string,
    prediction: PrepTimePrediction,
    orderDetails: { itemCount: number; orderValue: string }
  ): Promise<void> {
    try {
      const now = new Date();
      await db.insert(prepTimeHistory).values({
        merchantId,
        orderId,
        orderedAt: now,
        predictedPrepMinutes: prediction.predictedMinutes,
        itemCount: orderDetails.itemCount,
        orderValue: orderDetails.orderValue,
        hourOfDay: now.getHours(),
        dayOfWeek: now.getDay(),
      });
    } catch (error) {
      logger.error('Error saving prep time prediction:', error);
    }
  }

  /**
   * Get merchant's average prep time
   */
  async getMerchantPrepTimeStats(merchantId: string): Promise<{
    avgMinutes: number;
    minMinutes: number;
    maxMinutes: number;
    accuracy: number;
    sampleSize: number;
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const history = await db
        .select()
        .from(prepTimeHistory)
        .where(
          and(eq(prepTimeHistory.merchantId, merchantId), gte(prepTimeHistory.orderedAt, thirtyDaysAgo))
        );

      if (history.length === 0) {
        return {
          avgMinutes: 20,
          minMinutes: 10,
          maxMinutes: 30,
          accuracy: 0,
          sampleSize: 0,
        };
      }

      const actualTimes = history.filter((h) => h.actualPrepMinutes !== null).map((h) => h.actualPrepMinutes!);

      const avgMinutes = actualTimes.length > 0 ? actualTimes.reduce((a, b) => a + b, 0) / actualTimes.length : 20;

      const minMinutes = actualTimes.length > 0 ? Math.min(...actualTimes) : 10;
      const maxMinutes = actualTimes.length > 0 ? Math.max(...actualTimes) : 30;

      // Calculate accuracy: % of predictions within 5 minutes
      const accurate = history.filter(
        (h) => h.predictionErrorMinutes !== null && Math.abs(h.predictionErrorMinutes) <= 5
      );
      const accuracy = history.length > 0 ? (accurate.length / history.length) * 100 : 0;

      return {
        avgMinutes: Math.round(avgMinutes),
        minMinutes,
        maxMinutes,
        accuracy: Math.round(accuracy),
        sampleSize: history.length,
      };
    } catch (error) {
      logger.error('Error getting merchant prep time stats:', error);
      return {
        avgMinutes: 20,
        minMinutes: 10,
        maxMinutes: 30,
        accuracy: 0,
        sampleSize: 0,
      };
    }
  }

  // Private helper methods

  private async getMerchantBaseTime(merchantId: string, hour: number): Promise<number> {
    try {
      // Get recent history for this merchant
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const history = await db
        .select()
        .from(prepTimeHistory)
        .where(
          and(eq(prepTimeHistory.merchantId, merchantId), gte(prepTimeHistory.orderedAt, sevenDaysAgo))
        );

      if (history.length < 3) {
        // Not enough data, use meal-time defaults
        return this.getDefaultPrepTime(hour);
      }

      // Calculate average of actual prep times
      const actualTimes = history.filter((h) => h.actualPrepMinutes !== null).map((h) => h.actualPrepMinutes!);

      if (actualTimes.length === 0) {
        return this.getDefaultPrepTime(hour);
      }

      return Math.round(actualTimes.reduce((a, b) => a + b, 0) / actualTimes.length);
    } catch (error) {
      return this.getDefaultPrepTime(hour);
    }
  }

  private getDefaultPrepTime(hour: number): number {
    if (hour >= 6 && hour < 11) return this.DEFAULT_PREP_TIMES.breakfast;
    if (hour >= 11 && hour < 15) return this.DEFAULT_PREP_TIMES.lunch;
    if (hour >= 17 && hour < 22) return this.DEFAULT_PREP_TIMES.dinner;
    return this.DEFAULT_PREP_TIMES.snack;
  }

  private getTimeOfDayMultiplier(hour: number): number {
    // Rush hours are slower
    if ((hour >= 12 && hour <= 13) || (hour >= 18 && hour <= 20)) {
      return 1.3; // 30% slower during peak
    }
    if ((hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 21)) {
      return 1.15; // 15% slower around peak
    }
    return 1.0; // Normal speed
  }

  private getComplexityMultiplier(
    itemCount: number,
    orderValue: number,
    hasSpecialInstructions?: boolean
  ): number {
    let multiplier = 1.0;

    // More items = longer prep
    if (itemCount > 5) multiplier *= 1.3;
    else if (itemCount > 3) multiplier *= 1.15;

    // Higher value orders often more complex
    if (orderValue > 100) multiplier *= 1.2;
    else if (orderValue > 50) multiplier *= 1.1;

    // Special instructions add time
    if (hasSpecialInstructions) multiplier *= 1.1;

    return multiplier;
  }

  private getDayOfWeekMultiplier(dayOfWeek: number): number {
    // Weekend nights busier (Fri/Sat)
    if (dayOfWeek === 5 || dayOfWeek === 6) return 1.1;
    // Sunday brunch busy
    if (dayOfWeek === 0) return 1.05;
    return 1.0;
  }

  private async calculateConfidence(merchantId: string): Promise<number> {
    try {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(prepTimeHistory)
        .where(eq(prepTimeHistory.merchantId, merchantId));

      const sampleSize = count[0]?.count || 0;

      // Confidence increases with sample size
      if (sampleSize >= 50) return 95;
      if (sampleSize >= 20) return 80;
      if (sampleSize >= 10) return 65;
      if (sampleSize >= 5) return 50;
      return 30;
    } catch (error) {
      return 30;
    }
  }
}

export const prepTimePredictionService = new PrepTimePredictionService();
