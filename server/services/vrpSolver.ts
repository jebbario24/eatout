/**
 * Vehicle Routing Problem (VRP) Solver
 * Advanced route optimization with constraints
 * 
 * Implements a custom VRP solver with:
 * - Time window constraints
 * - Vehicle capacity constraints
 * - Multi-stop optimization
 * - Priority handling
 */

import { googleMapsService } from './googleMaps';
import type { LatLng } from './googleMaps';
import logger from '../logger';

interface TimeWindow {
  earliest: Date;
  latest: Date;
}

interface Stop {
  id: string;
  type: 'pickup' | 'dropoff';
  location: LatLng;
  address: string;
  orderId: string;
  restaurantId?: string;
  timeWindow?: TimeWindow;
  priority?: number; // 1 = highest
  estimatedServiceTime: number; // minutes to pickup/deliver
  weight?: number; // kg
  requiresCold?: boolean;
  requiresHot?: boolean;
}

interface Vehicle {
  id: string;
  driverId: string;
  currentLocation: LatLng;
  capacity: {
    maxOrders: number;
    maxWeight: number;
    hasColdStorage: boolean;
    hasHotStorage: boolean;
  };
  speed: number; // km/h average
  availableAt: Date;
}

interface VRPSolution {
  route: Stop[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  arrivalTimes: { stopId: string; arrivalTime: Date }[];
  constraintsSatisfied: boolean;
  violations: string[];
  score: number; // 0-100, higher is better
}

export class VRPSolver {
  /**
   * Solve Vehicle Routing Problem with constraints
   */
  async solve(
    stops: Stop[],
    vehicle: Vehicle,
    options: {
      optimizeFor?: 'distance' | 'time' | 'priority';
      allowViolations?: boolean;
      maxComputeTime?: number; // ms
    } = {}
  ): Promise<VRPSolution> {
    const {
      optimizeFor = 'time',
      allowViolations = false,
      maxComputeTime = 5000,
    } = options;

    const startTime = Date.now();

    try {
      // Step 1: Validate stops
      this.validateStops(stops, vehicle);

      // Step 2: Separate pickups and dropoffs
      const pickups = stops.filter(s => s.type === 'pickup');
      const dropoffs = stops.filter(s => s.type === 'dropoff');

      // Step 3: Build distance/time matrix
      const matrix = await this.buildDistanceMatrix(
        [vehicle.currentLocation, ...stops.map(s => s.location)]
      );

      // Step 4: Find best route using heuristic algorithms
      let bestSolution = await this.greedyInsertion(
        stops,
        vehicle,
        matrix,
        optimizeFor
      );

      // Step 5: Improve with local search (if time permits)
      const remainingTime = maxComputeTime - (Date.now() - startTime);
      if (remainingTime > 1000) {
        bestSolution = await this.localSearch(
          bestSolution,
          vehicle,
          matrix,
          optimizeFor,
          remainingTime
        );
      }

      // Step 6: Validate constraints
      const { satisfied, violations } = this.validateConstraints(
        bestSolution,
        vehicle,
        stops
      );

      if (!satisfied && !allowViolations) {
        throw new Error(`Constraints violated: ${violations.join(', ')}`);
      }

      logger.info('VRP solved', {
        stops: stops.length,
        distance: bestSolution.totalDistance,
        duration: bestSolution.totalDuration,
        violations: violations.length,
        computeTime: Date.now() - startTime,
      });

      return {
        ...bestSolution,
        constraintsSatisfied: satisfied,
        violations,
      };
    } catch (error) {
      logger.error('VRP solver failed', { error, stops: stops.length });
      throw error;
    }
  }

  /**
   * Greedy insertion heuristic
   * Builds initial solution by inserting stops where they fit best
   */
  private async greedyInsertion(
    stops: Stop[],
    vehicle: Vehicle,
    matrix: number[][],
    optimizeFor: string
  ): Promise<VRPSolution> {
    const route: Stop[] = [];
    const unvisited = [...stops];

    // Sort by priority first
    unvisited.sort((a, b) => (a.priority || 999) - (b.priority || 999));

    // Ensure pickups before dropoffs
    const pickups = unvisited.filter(s => s.type === 'pickup');
    const dropoffs = unvisited.filter(s => s.type === 'dropoff');

    // Insert all pickups first, then dropoffs
    for (const pickup of pickups) {
      const bestPosition = this.findBestInsertionPosition(
        route,
        pickup,
        vehicle,
        matrix,
        optimizeFor
      );
      route.splice(bestPosition, 0, pickup);
    }

    // Group dropoffs by order
    const dropoffsByOrder = new Map<string, Stop>();
    dropoffs.forEach(d => dropoffsByOrder.set(d.orderId, d));

    // Insert dropoffs after their corresponding pickups
    for (let i = 0; i < route.length; i++) {
      if (route[i].type === 'pickup') {
        const dropoff = dropoffsByOrder.get(route[i].orderId);
        if (dropoff) {
          // Insert dropoff after pickup (or find best position after)
          const bestPosition = this.findBestInsertionPosition(
            route.slice(i + 1),
            dropoff,
            vehicle,
            matrix,
            optimizeFor
          );
          route.splice(i + 1 + bestPosition, 0, dropoff);
        }
      }
    }

    return this.evaluateSolution(route, vehicle, matrix);
  }

  /**
   * Find best position to insert a stop
   */
  private findBestInsertionPosition(
    route: Stop[],
    stop: Stop,
    vehicle: Vehicle,
    matrix: number[][],
    optimizeFor: string
  ): number {
    if (route.length === 0) return 0;

    let bestPosition = 0;
    let bestCost = Infinity;

    // Try inserting at each position
    for (let i = 0; i <= route.length; i++) {
      const testRoute = [...route.slice(0, i), stop, ...route.slice(i)];
      const solution = this.evaluateSolution(testRoute, vehicle, matrix);

      const cost = optimizeFor === 'distance'
        ? solution.totalDistance
        : solution.totalDuration;

      if (cost < bestCost) {
        bestCost = cost;
        bestPosition = i;
      }
    }

    return bestPosition;
  }

  /**
   * Local search optimization (2-opt, swap, relocate)
   */
  private async localSearch(
    solution: VRPSolution,
    vehicle: Vehicle,
    matrix: number[][],
    optimizeFor: string,
    maxTime: number
  ): Promise<VRPSolution> {
    let currentSolution = solution;
    let improved = true;
    const startTime = Date.now();

    while (improved && Date.now() - startTime < maxTime) {
      improved = false;

      // Try 2-opt swap
      for (let i = 0; i < currentSolution.route.length - 1; i++) {
        for (let j = i + 2; j < currentSolution.route.length; j++) {
          const newRoute = [
            ...currentSolution.route.slice(0, i + 1),
            ...currentSolution.route.slice(i + 1, j + 1).reverse(),
            ...currentSolution.route.slice(j + 1),
          ];

          // Check if pickup/dropoff order is valid
          if (this.isValidPickupDropoffOrder(newRoute)) {
            const newSolution = this.evaluateSolution(newRoute, vehicle, matrix);

            const currentCost = optimizeFor === 'distance'
              ? currentSolution.totalDistance
              : currentSolution.totalDuration;
            const newCost = optimizeFor === 'distance'
              ? newSolution.totalDistance
              : newSolution.totalDuration;

            if (newCost < currentCost) {
              currentSolution = newSolution;
              improved = true;
            }
          }
        }
      }
    }

    return currentSolution;
  }

  /**
   * Check if pickups come before dropoffs
   */
  private isValidPickupDropoffOrder(route: Stop[]): boolean {
    const pickupIndices = new Map<string, number>();

    for (let i = 0; i < route.length; i++) {
      const stop = route[i];
      if (stop.type === 'pickup') {
        pickupIndices.set(stop.orderId, i);
      } else if (stop.type === 'dropoff') {
        const pickupIndex = pickupIndices.get(stop.orderId);
        if (pickupIndex === undefined || pickupIndex >= i) {
          return false; // Dropoff before pickup
        }
      }
    }

    return true;
  }

  /**
   * Evaluate solution quality
   */
  private evaluateSolution(
    route: Stop[],
    vehicle: Vehicle,
    matrix: number[][]
  ): VRPSolution {
    let totalDistance = 0;
    let totalDuration = 0;
    const arrivalTimes: { stopId: string; arrivalTime: Date }[] = [];
    let currentTime = vehicle.availableAt;

    // Start from vehicle location (index 0 in matrix)
    let prevIndex = 0;

    for (const stop of route) {
      const stopIndex = this.getStopIndex(stop, route) + 1; // +1 because 0 is vehicle location

      // Add travel time and distance
      const travelTime = matrix[prevIndex][stopIndex]; // seconds
      const travelDistance = travelTime * (vehicle.speed / 3.6); // Convert km/h to m/s

      totalDistance += travelDistance;
      totalDuration += travelTime;

      // Add service time
      currentTime = new Date(currentTime.getTime() + travelTime * 1000);
      arrivalTimes.push({ stopId: stop.id, arrivalTime: new Date(currentTime) });

      currentTime = new Date(currentTime.getTime() + stop.estimatedServiceTime * 60 * 1000);
      totalDuration += stop.estimatedServiceTime * 60;

      prevIndex = stopIndex;
    }

    // Calculate score (0-100)
    const score = this.calculateScore(route, totalDistance, totalDuration);

    return {
      route,
      totalDistance,
      totalDuration,
      arrivalTimes,
      constraintsSatisfied: true,
      violations: [],
      score,
    };
  }

  /**
   * Calculate optimization score
   */
  private calculateScore(route: Stop[], distance: number, duration: number): number {
    // Penalize long routes
    const distancePenalty = Math.min(distance / 1000 / 50, 1); // Normalize to 50km
    const durationPenalty = Math.min(duration / 3600 / 2, 1); // Normalize to 2 hours

    // Reward more stops (efficiency)
    const efficiencyBonus = Math.min(route.length / 8, 1); // Up to 8 stops

    const score = 100 * (1 - (distancePenalty + durationPenalty) / 2 + efficiencyBonus / 4);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Validate constraints
   */
  private validateConstraints(
    solution: VRPSolution,
    vehicle: Vehicle,
    stops: Stop[]
  ): { satisfied: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check capacity
    let currentLoad = 0;
    let currentOrders = 0;
    const activeOrders = new Set<string>();

    for (let i = 0; i < solution.route.length; i++) {
      const stop = solution.route[i];

      if (stop.type === 'pickup') {
        activeOrders.add(stop.orderId);
        currentLoad += stop.weight || 0;
        currentOrders++;

        if (currentOrders > vehicle.capacity.maxOrders) {
          violations.push(`Capacity exceeded at stop ${i}: ${currentOrders} > ${vehicle.capacity.maxOrders}`);
        }
        if (currentLoad > vehicle.capacity.maxWeight) {
          violations.push(`Weight exceeded at stop ${i}: ${currentLoad}kg > ${vehicle.capacity.maxWeight}kg`);
        }

        // Check storage requirements
        if (stop.requiresCold && !vehicle.capacity.hasColdStorage) {
          violations.push(`Stop ${i} requires cold storage but vehicle doesn't have it`);
        }
        if (stop.requiresHot && !vehicle.capacity.hasHotStorage) {
          violations.push(`Stop ${i} requires hot storage but vehicle doesn't have it`);
        }
      } else {
        activeOrders.delete(stop.orderId);
        currentLoad -= stop.weight || 0;
        currentOrders--;
      }
    }

    // Check time windows
    for (const { stopId, arrivalTime } of solution.arrivalTimes) {
      const stop = solution.route.find(s => s.id === stopId);
      if (stop?.timeWindow) {
        if (arrivalTime < stop.timeWindow.earliest) {
          violations.push(`Arrived too early at ${stopId}: ${arrivalTime.toISOString()}`);
        }
        if (arrivalTime > stop.timeWindow.latest) {
          violations.push(`Arrived too late at ${stopId}: ${arrivalTime.toISOString()}`);
        }
      }
    }

    return {
      satisfied: violations.length === 0,
      violations,
    };
  }

  /**
   * Build distance/time matrix using Google Maps
   */
  private async buildDistanceMatrix(locations: LatLng[]): Promise<number[][]> {
    const matrix: number[][] = Array(locations.length)
      .fill(0)
      .map(() => Array(locations.length).fill(0));

    // Get distance matrix from Google Maps
    const result = await googleMapsService.calculateDistanceMatrix(
      locations,
      locations
    );

    for (let i = 0; i < locations.length; i++) {
      for (let j = 0; j < locations.length; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          const element = result.rows[i]?.elements[j];
          if (element && element.status === 'OK') {
            matrix[i][j] = element.duration.value; // seconds
          } else {
            // Fallback to Haversine distance
            matrix[i][j] = this.estimateTravelTime(locations[i], locations[j]);
          }
        }
      }
    }

    return matrix;
  }

  /**
   * Estimate travel time using Haversine formula
   */
  private estimateTravelTime(from: LatLng, to: LatLng): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (from.lat * Math.PI) / 180;
    const φ2 = (to.lat * Math.PI) / 180;
    const Δφ = ((to.lat - from.lat) * Math.PI) / 180;
    const Δλ = ((to.lng - from.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // meters
    const avgSpeed = 30 / 3.6; // 30 km/h in m/s
    return Math.round(distance / avgSpeed); // seconds
  }

  /**
   * Get stop index in route
   */
  private getStopIndex(stop: Stop, route: Stop[]): number {
    return route.findIndex(s => s.id === stop.id);
  }

  /**
   * Validate stops before solving
   */
  private validateStops(stops: Stop[], vehicle: Vehicle): void {
    if (stops.length === 0) {
      throw new Error('No stops provided');
    }

    if (stops.length > 20) {
      throw new Error('Too many stops (max 20)');
    }

    // Check each order has both pickup and dropoff
    const orders = new Map<string, { hasPickup: boolean; hasDropoff: boolean }>();

    for (const stop of stops) {
      if (!orders.has(stop.orderId)) {
        orders.set(stop.orderId, { hasPickup: false, hasDropoff: false });
      }

      const order = orders.get(stop.orderId)!;
      if (stop.type === 'pickup') order.hasPickup = true;
      if (stop.type === 'dropoff') order.hasDropoff = true;
    }

    for (const [orderId, { hasPickup, hasDropoff }] of orders) {
      if (!hasPickup || !hasDropoff) {
        throw new Error(`Order ${orderId} missing ${!hasPickup ? 'pickup' : 'dropoff'}`);
      }
    }
  }
}

// Export singleton
export const vrpSolver = new VRPSolver();
export type { Stop, Vehicle, VRPSolution, TimeWindow };
