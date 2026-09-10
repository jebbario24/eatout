/**
 * Traffic-Aware ETA Service
 * 
 * Provides accurate delivery ETAs considering:
 * - Real-time traffic from Google Maps
 * - Historical delivery times by route
 * - Time-of-day traffic patterns
 * - Driver-specific speed patterns
 * 
 * ML-ready: Collects actual vs predicted for training
 */

import { db } from '../db';
import { etaPredictions, orders, driverPerformanceMetrics } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import logger from '../logger';
import { googleMapsService } from './googleMaps';

interface ETAPrediction {
  estimatedMinutes: number;
  estimatedArrival: Date;
  confidence: number; // 0-100
  trafficLevel: 'low' | 'medium' | 'high' | 'very_high';
  factors: {
    baseTime: number;
    trafficMultiplier: number;
    driverSpeedMultiplier: number;
    timeOfDayMultiplier: number;
  };
}

export class TrafficAwareETAService {
  /**
   * Calculate smart ETA for a delivery
   */
  async calculateSmartETA(
    driverId: string,
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    currentTime: Date = new Date()
  ): Promise<ETAPrediction> {
    try {
      // 1. Get baseline from Google Maps with current traffic
      const routeInfo = await this.getRouteWithTraffic(from, to);
      const baseMinutes = routeInfo.durationMinutes;
      const trafficLevel = routeInfo.trafficLevel;

      // 2. Get driver's historical speed multiplier
      const driverMultiplier = await this.getDriverSpeedMultiplier(driverId);

      // 3. Apply time-of-day adjustment
      const hour = currentTime.getHours();
      const timeMultiplier = this.getTimeOfDayMultiplier(hour);

      // 4. Apply traffic multiplier
      const trafficMultiplier = this.getTrafficMultiplier(trafficLevel);

      // Calculate final ETA
      const adjustedMinutes = Math.round(
        baseMinutes * driverMultiplier * timeMultiplier * trafficMultiplier
      );

      const estimatedArrival = new Date(currentTime);
      estimatedArrival.setMinutes(estimatedArrival.getMinutes() + adjustedMinutes);

      // Confidence based on data availability
      const confidence = this.calculateConfidence(routeInfo.hasRealTimeTraffic, driverId);

      return {
        estimatedMinutes: adjustedMinutes,
        estimatedArrival,
        confidence,
        trafficLevel,
        factors: {
          baseTime: baseMinutes,
          trafficMultiplier,
          driverSpeedMultiplier: driverMultiplier,
          timeOfDayMultiplier: timeMultiplier,
        },
      };
    } catch (error) {
      logger.error('Error calculating smart ETA:', error);
      // Fallback to simple estimate
      return this.getFallbackETA(from, to, currentTime);
    }
  }

  /**
   * Get route info with real-time traffic from Google Maps
   */
  private async getRouteWithTraffic(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ): Promise<{
    durationMinutes: number;
    distanceKm: number;
    trafficLevel: 'low' | 'medium' | 'high' | 'very_high';
    hasRealTimeTraffic: boolean;
  }> {
    try {
      // Use Google Maps Directions API with traffic model
      const routeResponse = await googleMapsService.calculateRoute(
        from,
        to,
        { departureTime: new Date(), trafficModel: 'best_guess' }
      );

      if (!routeResponse || !routeResponse.routes || routeResponse.routes.length === 0) {
        throw new Error('No route found');
      }

      const route = routeResponse.routes[0];
      const durationInTrafficSeconds = route.durationInTrafficSeconds || route.durationSeconds;
      const durationMinutes = Math.ceil(durationInTrafficSeconds / 60);
      const distanceKm = route.distanceMeters / 1000;

      // Determine traffic level by comparing normal vs traffic duration
      const normalDuration = route.durationSeconds / 60;
      const trafficDelay = durationMinutes - normalDuration;
      let trafficLevel: 'low' | 'medium' | 'high' | 'very_high' = 'low';

      if (trafficDelay > 15) trafficLevel = 'very_high';
      else if (trafficDelay > 8) trafficLevel = 'high';
      else if (trafficDelay > 3) trafficLevel = 'medium';

      return {
        durationMinutes,
        distanceKm,
        trafficLevel,
        hasRealTimeTraffic: !!route.durationInTrafficSeconds,
      };
    } catch (error) {
      logger.error('Error getting route with traffic:', error);
      // Fallback to distance-based estimate
      const distance = this.calculateDistance(from.lat, from.lng, to.lat, to.lng);
      return {
        durationMinutes: Math.ceil((distance / 40) * 60), // Assume 40 km/h average
        distanceKm: distance,
        trafficLevel: 'medium',
        hasRealTimeTraffic: false,
      };
    }
  }

  /**
   * Get driver's speed multiplier based on historical performance
   */
  private async getDriverSpeedMultiplier(driverId: string): Promise<number> {
    try {
      // Get driver's recent performance
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split('T')[0];

      const [recentPerf] = await db
        .select()
        .from(driverPerformanceMetrics)
        .where(and(eq(driverPerformanceMetrics.driverId, driverId), sql`${driverPerformanceMetrics.date} >= ${startDate}`))
        .orderBy(sql`${driverPerformanceMetrics.date} DESC`)
        .limit(1);

      if (recentPerf && recentPerf.avgDeliveryTimeMinutes) {
        const avgMinutes = recentPerf.avgDeliveryTimeMinutes;
        const platformAvg = 25; // Platform average delivery time
        // If driver is faster, multiplier < 1.0. If slower, multiplier > 1.0
        return avgMinutes / platformAvg;
      }

      return 1.0; // Neutral if no data
    } catch (error) {
      logger.error('Error getting driver speed multiplier:', error);
      return 1.0;
    }
  }

  /**
   * Time-of-day traffic multiplier
   */
  private getTimeOfDayMultiplier(hour: number): number {
    // Rush hours (7-9 AM, 5-7 PM) are slower
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return 1.25; // 25% slower
    }
    // Lunch time (12-1 PM)
    if (hour >= 12 && hour <= 13) {
      return 1.15; // 15% slower
    }
    // Late night (10 PM - 5 AM) is faster
    if (hour >= 22 || hour <= 5) {
      return 0.85; // 15% faster
    }
    return 1.0; // Normal
  }

  /**
   * Traffic level multiplier
   */
  private getTrafficMultiplier(trafficLevel: string): number {
    switch (trafficLevel) {
      case 'very_high':
        return 1.4;
      case 'high':
        return 1.25;
      case 'medium':
        return 1.1;
      case 'low':
      default:
        return 1.0;
    }
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(hasRealTimeTraffic: boolean, driverId: string): number {
    let confidence = 50; // Base confidence

    if (hasRealTimeTraffic) confidence += 30; // Real traffic data adds confidence
    // Driver history would add more confidence (checked in getDriverSpeedMultiplier)
    confidence += 10; // Assume some driver data exists

    return Math.min(confidence, 95); // Cap at 95%
  }

  /**
   * Record actual arrival for learning
   */
  async recordActualArrival(
    deliveryId: string,
    driverId: string,
    predictedEta: Date,
    actualArrival: Date,
    routeInfo: { distanceKm: number; trafficLevel: string }
  ): Promise<void> {
    try {
      const errorMinutes = Math.round(
        (actualArrival.getTime() - predictedEta.getTime()) / (1000 * 60)
      );

      await db.insert(etaPredictions).values({
        deliveryId,
        driverId,
        predictedEta,
        actualArrival,
        predictionErrorMinutes: errorMinutes,
        trafficLevel: routeInfo.trafficLevel,
        weatherCondition: null, // TODO: Integrate weather API
        routeDistanceKm: routeInfo.distanceKm.toFixed(2),
        routeDurationMinutes: Math.abs(errorMinutes),
      });

      logger.info(
        `Recorded ETA accuracy for delivery ${deliveryId}: predicted ${predictedEta.toISOString()}, actual ${actualArrival.toISOString()}, error: ${errorMinutes} min`
      );
    } catch (error) {
      logger.error('Error recording ETA accuracy:', error);
    }
  }

  /**
   * Get ETA accuracy statistics for a driver
   */
  async getETAAccuracy(driverId: string, days: number = 30): Promise<{
    avgErrorMinutes: number;
    accuracy: number; // % within 5 minutes
    sampleSize: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const predictions = await db
        .select()
        .from(etaPredictions)
        .where(
          and(
            eq(etaPredictions.driverId, driverId),
            sql`${etaPredictions.createdAt} >= ${cutoffDate}`
          )
        );

      if (predictions.length === 0) {
        return { avgErrorMinutes: 0, accuracy: 0, sampleSize: 0 };
      }

      const errors = predictions
        .filter((p) => p.predictionErrorMinutes !== null)
        .map((p) => p.predictionErrorMinutes!);

      const avgError = errors.reduce((sum, err) => sum + Math.abs(err), 0) / errors.length;
      const accurate = errors.filter((err) => Math.abs(err) <= 5).length;
      const accuracy = (accurate / errors.length) * 100;

      return {
        avgErrorMinutes: Math.round(avgError),
        accuracy: Math.round(accuracy),
        sampleSize: predictions.length,
      };
    } catch (error) {
      logger.error('Error getting ETA accuracy:', error);
      return { avgErrorMinutes: 0, accuracy: 0, sampleSize: 0 };
    }
  }

  /**
   * Fallback ETA calculation
   */
  private getFallbackETA(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    currentTime: Date
  ): ETAPrediction {
    const distance = this.calculateDistance(from.lat, from.lng, to.lat, to.lng);
    const estimatedMinutes = Math.ceil((distance / 40) * 60); // 40 km/h average

    const estimatedArrival = new Date(currentTime);
    estimatedArrival.setMinutes(estimatedArrival.getMinutes() + estimatedMinutes);

    return {
      estimatedMinutes,
      estimatedArrival,
      confidence: 30, // Low confidence for fallback
      trafficLevel: 'medium',
      factors: {
        baseTime: estimatedMinutes,
        trafficMultiplier: 1.0,
        driverSpeedMultiplier: 1.0,
        timeOfDayMultiplier: 1.0,
      },
    };
  }

  /**
   * Calculate distance using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
}

export const trafficAwareETAService = new TrafficAwareETAService();
