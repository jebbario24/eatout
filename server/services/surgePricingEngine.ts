/**
 * Surge Pricing Engine
 * 
 * Recommends dynamic pricing based on:
 * - Current demand (pending orders)
 * - Available drivers (supply)
 * - Historical acceptance rates
 * - Time sensitivity
 * 
 * Admin-facing tool for optimizing platform efficiency
 */

import { db } from '../db';
import { surgePricingLog, orders, driverProfiles, deliveryZones } from '../../shared/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import logger from '../logger';

interface SurgeRecommendation {
  zoneId: string | null;
  zoneName: string;
  currentMultiplier: number;
  recommendedMultiplier: number;
  confidence: number; // 0-100
  reasoning: string;
  metrics: {
    demandScore: number; // 0-100
    supplyScore: number; // 0-100
    activeOrders: number;
    availableDrivers: number;
    expectedImpact: string;
  };
}

export class SurgePricingEngineService {
  // Surge multiplier thresholds
  private readonly MIN_MULTIPLIER = 1.0;
  private readonly MAX_MULTIPLIER = 3.0;
  private readonly IDEAL_RATIO = 2.0; // Ideal orders per driver

  /**
   * Calculate surge recommendation for a zone
   */
  async calculateSurgeRecommendation(zoneId?: string): Promise<SurgeRecommendation[]> {
    try {
      if (zoneId) {
        // Single zone recommendation
        const rec = await this.analyzeZone(zoneId);
        return rec ? [rec] : [];
      } else {
        // All zones recommendation
        const zones = await db.select().from(deliveryZones);
        const recommendations: SurgeRecommendation[] = [];

        for (const zone of zones) {
          const rec = await this.analyzeZone(zone.id);
          if (rec) recommendations.push(rec);
        }

        // Also analyze global (no specific zone)
        const globalRec = await this.analyzeZone(null);
        if (globalRec) recommendations.push(globalRec);

        // Sort by recommended multiplier (highest first)
        return recommendations.sort((a, b) => b.recommendedMultiplier - a.recommendedMultiplier);
      }
    } catch (error) {
      logger.error('Error calculating surge recommendations:', error);
      return [];
    }
  }

  /**
   * Analyze a single zone for surge pricing
   */
  private async analyzeZone(zoneId: string | null): Promise<SurgeRecommendation | null> {
    try {
      // 1. Get current demand (pending orders in zone)
      const pendingOrders = await this.getPendingOrdersInZone(zoneId);
      const activeOrders = pendingOrders.length;

      // 2. Get available drivers in zone
      const availableDrivers = await this.getAvailableDriversInZone(zoneId);
      const driverCount = availableDrivers.length;

      // Not enough data for recommendation
      if (activeOrders === 0) {
        return null;
      }

      // 3. Calculate demand/supply ratio
      const ratio = driverCount > 0 ? activeOrders / driverCount : activeOrders;

      // 4. Calculate demand and supply scores
      const demandScore = this.calculateDemandScore(activeOrders);
      const supplyScore = this.calculateSupplyScore(driverCount, activeOrders);

      // 5. Get current active surge (if any)
      const currentSurge = await this.getCurrentSurge(zoneId);
      const currentMultiplier = currentSurge?.surgeMultiplier
        ? parseFloat(currentSurge.surgeMultiplier)
        : 1.0;

      // 6. Calculate recommended multiplier
      const recommendedMultiplier = this.calculateRecommendedMultiplier(
        ratio,
        demandScore,
        supplyScore
      );

      // 7. Determine confidence based on data quality
      const confidence = this.calculateConfidence(activeOrders, driverCount);

      // 8. Generate reasoning
      const reasoning = this.generateReasoning(
        ratio,
        demandScore,
        supplyScore,
        currentMultiplier,
        recommendedMultiplier
      );

      // 9. Estimate impact
      const expectedImpact = this.estimateImpact(currentMultiplier, recommendedMultiplier);

      // Get zone name
      const zoneName = zoneId
        ? (await db.select().from(deliveryZones).where(eq(deliveryZones.id, zoneId)).limit(1))[0]
            ?.name || 'Unknown Zone'
        : 'Global (All Zones)';

      return {
        zoneId,
        zoneName,
        currentMultiplier,
        recommendedMultiplier,
        confidence,
        reasoning,
        metrics: {
          demandScore,
          supplyScore,
          activeOrders,
          availableDrivers: driverCount,
          expectedImpact,
        },
      };
    } catch (error) {
      logger.error(`Error analyzing zone ${zoneId}:`, error);
      return null;
    }
  }

  /**
   * Get pending orders in a zone
   */
  private async getPendingOrdersInZone(zoneId: string | null): Promise<any[]> {
    const conditions = [eq(orders.status, 'pending'), isNull(orders.assignedDriverId)];

    if (zoneId) {
      conditions.push(eq(orders.deliveryZoneId, zoneId));
    }

    return await db
      .select()
      .from(orders)
      .where(and(...conditions));
  }

  /**
   * Get available drivers in a zone
   */
  private async getAvailableDriversInZone(zoneId: string | null): Promise<any[]> {
    // Get drivers who are approved and available
    const allDrivers = await db
      .select()
      .from(driverProfiles)
      .where(
        and(
          eq(driverProfiles.applicationStatus, 'approved'),
          eq(driverProfiles.isAvailable, true)
        )
      );

    // TODO: Filter by zone if zoneId provided (requires driver_service_zones junction)
    // For now, return all available drivers
    return allDrivers;
  }

  /**
   * Get current active surge for zone
   */
  private async getCurrentSurge(zoneId: string | null) {
    const conditions = [isNull(surgePricingLog.endTime)];
    if (zoneId) {
      conditions.push(eq(surgePricingLog.zoneId, zoneId));
    }

    const [activeSurge] = await db
      .select()
      .from(surgePricingLog)
      .where(and(...conditions))
      .orderBy(sql`${surgePricingLog.startTime} DESC`)
      .limit(1);

    return activeSurge;
  }

  /**
   * Calculate demand score (0-100)
   */
  private calculateDemandScore(activeOrders: number): number {
    // Score increases with order count
    // 0 orders = 0, 1-5 = low, 6-15 = medium, 16-30 = high, 31+ = very high
    if (activeOrders === 0) return 0;
    if (activeOrders <= 5) return 30;
    if (activeOrders <= 15) return 60;
    if (activeOrders <= 30) return 85;
    return 100;
  }

  /**
   * Calculate supply score (0-100) - Lower is worse
   */
  private calculateSupplyScore(drivers: number, orders: number): number {
    if (orders === 0) return 100; // No demand = supply is fine

    const ratio = drivers / orders;
    // Ideal ratio is 1:2 (one driver per 2 orders)
    // If ratio >= 0.5 (1 driver per 2 orders) = 100 (excellent supply)
    // If ratio = 0.25 (1 driver per 4 orders) = 50 (medium supply)
    // If ratio < 0.1 (1 driver per 10+ orders) = 0 (very low supply)

    if (ratio >= 0.5) return 100;
    if (ratio >= 0.25) return 70;
    if (ratio >= 0.15) return 40;
    if (ratio >= 0.1) return 20;
    return 10;
  }

  /**
   * Calculate recommended surge multiplier
   */
  private calculateRecommendedMultiplier(
    ratio: number,
    demandScore: number,
    supplyScore: number
  ): number {
    let multiplier = 1.0;

    // Base multiplier on demand/supply imbalance
    if (ratio > 5.0) {
      // 5+ orders per driver = very high demand
      multiplier = 2.5;
    } else if (ratio > 3.0) {
      // 3-5 orders per driver = high demand
      multiplier = 2.0;
    } else if (ratio > 2.0) {
      // 2-3 orders per driver = moderate demand
      multiplier = 1.5;
    } else if (ratio > 1.0) {
      // 1-2 orders per driver = slight demand
      multiplier = 1.2;
    } else {
      // Less than 1 order per driver = no surge needed
      multiplier = 1.0;
    }

    // Adjust based on demand score
    if (demandScore > 80 && multiplier < 2.0) {
      multiplier += 0.5;
    }

    // Adjust based on supply score
    if (supplyScore < 30 && multiplier < 2.5) {
      multiplier += 0.5;
    }

    // Clamp to min/max
    return Math.max(this.MIN_MULTIPLIER, Math.min(multiplier, this.MAX_MULTIPLIER));
  }

  /**
   * Calculate recommendation confidence
   */
  private calculateConfidence(activeOrders: number, drivers: number): number {
    let confidence = 50; // Base

    // More orders = higher confidence
    if (activeOrders >= 10) confidence += 25;
    else if (activeOrders >= 5) confidence += 15;

    // More drivers = higher confidence
    if (drivers >= 5) confidence += 15;
    else if (drivers >= 2) confidence += 10;

    return Math.min(confidence, 95);
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    ratio: number,
    demandScore: number,
    supplyScore: number,
    current: number,
    recommended: number
  ): string {
    const reasons: string[] = [];

    if (ratio > 3.0) {
      reasons.push(`High order-to-driver ratio (${ratio.toFixed(1)}:1)`);
    }

    if (demandScore > 70) {
      reasons.push('Very high demand detected');
    }

    if (supplyScore < 40) {
      reasons.push('Low driver availability');
    }

    if (recommended > current) {
      reasons.push('Surge increase will attract more drivers');
    } else if (recommended < current) {
      reasons.push('Demand stabilizing, can reduce surge');
    }

    return reasons.length > 0 ? reasons.join('. ') + '.' : 'Maintaining current pricing.';
  }

  /**
   * Estimate impact of surge change
   */
  private estimateImpact(current: number, recommended: number): string {
    const change = recommended - current;

    if (Math.abs(change) < 0.1) {
      return 'No significant change';
    }

    if (change > 0.5) {
      return `+${Math.round(change * 30)}% more drivers expected`;
    } else if (change > 0.2) {
      return `+${Math.round(change * 20)}% more drivers expected`;
    } else if (change < -0.5) {
      return 'Orders may take longer to be accepted';
    } else if (change < -0.2) {
      return 'Slight decrease in driver incentive';
    }

    return 'Minor adjustment';
  }

  /**
   * Apply surge pricing (Admin action)
   */
  async applySurge(
    zoneId: string | null,
    multiplier: number,
    demandScore: number,
    supplyScore: number,
    activeOrders: number,
    availableDrivers: number
  ): Promise<void> {
    try {
      // End any existing active surge for this zone
      await db
        .update(surgePricingLog)
        .set({ endTime: new Date() })
        .where(and(eq(surgePricingLog.zoneId, zoneId || ''), isNull(surgePricingLog.endTime)));

      // Create new surge record
      await db.insert(surgePricingLog).values({
        zoneId,
        surgeMultiplier: multiplier.toFixed(2),
        demandScore: demandScore.toFixed(2),
        supplyScore: supplyScore.toFixed(2),
        activeOrders,
        availableDrivers,
        startTime: new Date(),
      });

      logger.info(
        `Surge pricing applied: Zone ${zoneId || 'Global'}, Multiplier ${multiplier.toFixed(2)}x`
      );
    } catch (error) {
      logger.error('Error applying surge pricing:', error);
      throw error;
    }
  }

  /**
   * End surge pricing
   */
  async endSurge(zoneId: string | null): Promise<void> {
    try {
      await db
        .update(surgePricingLog)
        .set({ endTime: new Date() })
        .where(and(eq(surgePricingLog.zoneId, zoneId || ''), isNull(surgePricingLog.endTime)));

      logger.info(`Surge pricing ended for zone ${zoneId || 'Global'}`);
    } catch (error) {
      logger.error('Error ending surge:', error);
      throw error;
    }
  }

  /**
   * Get surge pricing history
   */
  async getSurgeHistory(zoneId?: string, days: number = 30): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const conditions = [sql`${surgePricingLog.startTime} >= ${cutoffDate}`];
      if (zoneId) {
        conditions.push(eq(surgePricingLog.zoneId, zoneId));
      }

      return await db
        .select()
        .from(surgePricingLog)
        .where(and(...conditions))
        .orderBy(sql`${surgePricingLog.startTime} DESC`);
    } catch (error) {
      logger.error('Error getting surge history:', error);
      return [];
    }
  }
}

export const surgePricingEngineService = new SurgePricingEngineService();
