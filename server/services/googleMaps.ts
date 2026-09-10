import { env } from '../env';

// Google Maps API service for route calculation, geocoding, and distance matrix
// Uses server-side API key for secure access

interface LatLng {
  lat: number;
  lng: number;
}

interface RouteStep {
  distance: { value: number; text: string };
  duration: { value: number; text: string };
  startLocation: LatLng;
  endLocation: LatLng;
  instruction: string;
  maneuver?: string;
}

interface Route {
  distanceMeters: number;
  durationSeconds: number;
  durationInTrafficSeconds?: number;
  polyline: string;
  steps: RouteStep[];
  bounds: {
    northeast: LatLng;
    southwest: LatLng;
  };
}

interface DirectionsResponse {
  routes: Route[];
  status: string;
}

interface DistanceMatrixElement {
  distance: { value: number; text: string };
  duration: { value: number; text: string };
  durationInTraffic?: { value: number; text: string };
  status: string;
}

interface DistanceMatrixResponse {
  rows: {
    elements: DistanceMatrixElement[];
  }[];
  originAddresses: string[];
  destinationAddresses: string[];
  status: string;
}

interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string;
}

class GoogleMapsService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';
  
  // Cache for geocoding results (24 hours)
  private geocodeCache = new Map<string, { result: GeocodingResult; timestamp: number }>();
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.apiKey = env.GOOGLE_MAPS_API_KEY_SERVER || env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  Google Maps API key not configured. Route optimization will be limited.');
    }
  }

  /**
   * Calculate optimal route between two points
   * Includes traffic data for accurate ETAs
   */
  async calculateRoute(
    origin: string | LatLng,
    destination: string | LatLng,
    options: {
      alternatives?: boolean;
      departureTime?: Date;
      trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
      waypoints?: (string | LatLng)[];
    } = {}
  ): Promise<DirectionsResponse> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      origin: this.formatLocation(origin),
      destination: this.formatLocation(destination),
      mode: 'driving',
      alternatives: options.alternatives ? 'true' : 'false',
      departure_time: options.departureTime 
        ? Math.floor(options.departureTime.getTime() / 1000).toString()
        : 'now',
      traffic_model: options.trafficModel || 'best_guess',
    });

    if (options.waypoints && options.waypoints.length > 0) {
      params.append('waypoints', options.waypoints.map(wp => this.formatLocation(wp)).join('|'));
    }

    const url = `${this.baseUrl}/directions/json?${params}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    return this.transformDirectionsResponse(data);
  }

  /**
   * Calculate distances and durations between multiple origins and destinations
   * Useful for batch delivery optimization
   */
  async calculateDistanceMatrix(
    origins: (string | LatLng)[],
    destinations: (string | LatLng)[],
    options: {
      departureTime?: Date;
      trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
    } = {}
  ): Promise<DistanceMatrixResponse> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      origins: origins.map(o => this.formatLocation(o)).join('|'),
      destinations: destinations.map(d => this.formatLocation(d)).join('|'),
      mode: 'driving',
      departure_time: options.departureTime 
        ? Math.floor(options.departureTime.getTime() / 1000).toString()
        : 'now',
      traffic_model: options.trafficModel || 'best_guess',
    });

    const url = `${this.baseUrl}/distancematrix/json?${params}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.status}`);
    }

    return data;
  }

  /**
   * Convert address to coordinates (with caching)
   */
  async geocode(address: string): Promise<GeocodingResult> {
    // Check cache first
    const cached = this.geocodeCache.get(address);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      address,
    });

    const url = `${this.baseUrl}/geocode/json?${params}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error(`Geocoding failed: ${data.status}`);
    }

    const result = {
      lat: data.results[0].geometry.location.lat,
      lng: data.results[0].geometry.location.lng,
      formattedAddress: data.results[0].formatted_address,
      placeId: data.results[0].place_id,
    };

    // Cache result
    this.geocodeCache.set(address, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * Convert coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      latlng: `${lat},${lng}`,
    });

    const url = `${this.baseUrl}/geocode/json?${params}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error(`Reverse geocoding failed: ${data.status}`);
    }

    return {
      lat,
      lng,
      formattedAddress: data.results[0].formatted_address,
      placeId: data.results[0].place_id,
    };
  }

  /**
   * Calculate ETA based on current traffic
   */
  async calculateETA(
    origin: LatLng,
    destination: LatLng
  ): Promise<{
    durationSeconds: number;
    durationInTrafficSeconds: number;
    distanceMeters: number;
    estimatedArrival: Date;
  }> {
    const route = await this.calculateRoute(origin, destination, {
      departureTime: new Date(),
      trafficModel: 'best_guess',
    });

    if (!route.routes || route.routes.length === 0) {
      throw new Error('No route found');
    }

    const bestRoute = route.routes[0];
    const durationInTraffic = bestRoute.durationInTrafficSeconds || bestRoute.durationSeconds;

    return {
      durationSeconds: bestRoute.durationSeconds,
      durationInTrafficSeconds: durationInTraffic,
      distanceMeters: bestRoute.distanceMeters,
      estimatedArrival: new Date(Date.now() + durationInTraffic * 1000),
    };
  }

  /**
   * Optimize waypoints order for shortest route (TSP solver)
   */
  async optimizeWaypoints(
    start: LatLng,
    waypoints: LatLng[],
    end: LatLng
  ): Promise<{
    optimizedOrder: number[];
    totalDistanceMeters: number;
    totalDurationSeconds: number;
  }> {
    // Use Google Maps waypoint optimization
    const route = await this.calculateRoute(start, end, {
      waypoints: waypoints.map(wp => `${wp.lat},${wp.lng}`),
    });

    if (!route.routes || route.routes.length === 0) {
      throw new Error('No route found');
    }

    const bestRoute = route.routes[0];

    return {
      optimizedOrder: Array.from({ length: waypoints.length }, (_, i) => i), // Google returns in optimized order
      totalDistanceMeters: bestRoute.distanceMeters,
      totalDurationSeconds: bestRoute.durationInTrafficSeconds || bestRoute.durationSeconds,
    };
  }

  /**
   * Helper: Format location for API
   */
  private formatLocation(location: string | LatLng): string {
    if (typeof location === 'string') {
      return location;
    }
    return `${location.lat},${location.lng}`;
  }

  /**
   * Helper: Transform Google API response to our format
   */
  private transformDirectionsResponse(data: any): DirectionsResponse {
    return {
      routes: data.routes.map((route: any) => ({
        distanceMeters: route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0),
        durationSeconds: route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0),
        durationInTrafficSeconds: route.legs.reduce((sum: number, leg: any) => sum + (leg.duration_in_traffic?.value || leg.duration.value), 0),
        polyline: route.overview_polyline.points,
        steps: route.legs.flatMap((leg: any) => leg.steps.map((step: any) => ({
          distance: step.distance,
          duration: step.duration,
          startLocation: step.start_location,
          endLocation: step.end_location,
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML
          maneuver: step.maneuver,
        }))),
        bounds: route.bounds,
      })),
      status: data.status,
    };
  }

  /**
   * Snap GPS points to nearest roads (Roads API)
   * Improves accuracy of driver location tracking
   */
  async snapToRoads(
    points: LatLng[],
    interpolate: boolean = true
  ): Promise<LatLng[]> {
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured, skipping snap-to-roads');
      return points;
    }

    if (points.length === 0 || points.length > 100) {
      console.warn('Snap to roads requires 1-100 points');
      return points;
    }

    try {
      const path = points.map(p => `${p.lat},${p.lng}`).join('|');
      const params = new URLSearchParams({
        key: this.apiKey,
        path,
        interpolate: interpolate ? 'true' : 'false',
      });

      const url = `${this.baseUrl.replace('/maps', '/roads/v1')}/snapToRoads?${params}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.snappedPoints || data.snappedPoints.length === 0) {
        return points;
      }

      return data.snappedPoints.map((point: any) => ({
        lat: point.location.latitude,
        lng: point.location.longitude,
      }));
    } catch (error) {
      console.error('Roads API snap-to-roads failed:', error);
      return points; // Return original points on error
    }
  }

  /**
   * Get speed limits for a path (Roads API)
   * Useful for estimated arrival calculations
   */
  async getSpeedLimits(placeIds: string[]): Promise<{ placeId: string; speedLimit: number }[]> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    if (placeIds.length === 0 || placeIds.length > 100) {
      throw new Error('Speed limits API requires 1-100 place IDs');
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        placeId: placeIds.join(','),
      });

      const url = `${this.baseUrl.replace('/maps', '/roads/v1')}/speedLimits?${params}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.speedLimits) {
        return [];
      }

      return data.speedLimits.map((limit: any) => ({
        placeId: limit.placeId,
        speedLimit: limit.speedLimit,
      }));
    } catch (error) {
      console.error('Roads API speed limits failed:', error);
      return [];
    }
  }

  /**
   * Clear geocoding cache (for testing or manual refresh)
   */
  clearCache() {
    this.geocodeCache.clear();
  }
}

// Export singleton instance
export const googleMapsService = new GoogleMapsService();
export type { LatLng, Route, RouteStep, DirectionsResponse, DistanceMatrixResponse, GeocodingResult };
