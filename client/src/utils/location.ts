// Location utilities for driver tracking and distance calculations

export interface Location {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Estimate travel time based on distance
 * Assumes average speed of 30 km/h in city
 */
export function estimateTravelTime(km: number): string {
  const hours = km / 30; // 30 km/h average city speed
  const minutes = Math.round(hours * 60);
  
  if (minutes < 1) {
    return "< 1 min";
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/**
 * Get current location using browser geolocation API
 */
export function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Geocode address to coordinates using Google Maps Geocoding API
 * Note: This requires a Google Maps API key
 */
export async function geocodeAddress(
  address: string,
  apiKey?: string
): Promise<Location | null> {
  if (!apiKey) {
    // Fallback: Try to extract coordinates from address if it contains them
    // This is a simple fallback - in production, you'd want proper geocoding
    console.warn("No API key provided for geocoding");
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${apiKey}`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }

  return null;
}

/**
 * Calculate route distance and time using Google Maps Directions API
 * Note: This requires a Google Maps API key
 */
export async function calculateRoute(
  origin: Location,
  destination: Location,
  apiKey?: string
): Promise<{ distance: string; duration: string } | null> {
  if (!apiKey) {
    // Fallback: Calculate straight-line distance
    const km = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    return {
      distance: formatDistance(km),
      duration: estimateTravelTime(km),
    };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${apiKey}`
    );
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      
      return {
        distance: leg.distance.text,
        duration: leg.duration.text,
      };
    }
  } catch (error) {
    console.error("Route calculation error:", error);
  }

  return null;
}

