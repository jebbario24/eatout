import { useEffect, useState } from 'react';

let isGoogleMapsLoading = false;
let isGoogleMapsLoaded = false;

interface GoogleMapsLoaderProps {
  children: React.ReactNode;
  apiKey?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Google Maps Loader Component
 * Loads the Google Maps JavaScript API and provides it to children
 */
export function GoogleMapsLoader({ children, apiKey, onLoad, onError }: GoogleMapsLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(isGoogleMapsLoaded);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    // If already loaded, just call onLoad
    if (isGoogleMapsLoaded) {
      setIsLoaded(true);
      onLoad?.();
      return;
    }

    // If currently loading, wait for it
    if (isGoogleMapsLoading) {
      const checkInterval = setInterval(() => {
        if (isGoogleMapsLoaded) {
          clearInterval(checkInterval);
          setIsLoaded(true);
          onLoad?.();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    // Start loading
    isGoogleMapsLoading = true;

    const loadGoogleMaps = () => {
      if (typeof window === 'undefined') {
        return;
      }

      // Check if already loaded
      if (window.google && window.google.maps) {
        isGoogleMapsLoaded = true;
        isGoogleMapsLoading = false;
        setIsLoaded(true);
        onLoad?.();
        return;
      }

      // Get API key from environment or props
      const key = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
      
      if (!key) {
        const error = new Error('Google Maps API key not configured');
        setLoadError(error);
        onError?.(error);
        isGoogleMapsLoading = false;
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry,directions`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        isGoogleMapsLoaded = true;
        isGoogleMapsLoading = false;
        setIsLoaded(true);
        onLoad?.();
      };

      script.onerror = () => {
        const error = new Error('Failed to load Google Maps API');
        isGoogleMapsLoading = false;
        setLoadError(error);
        onError?.(error);
      };

      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [apiKey, onLoad, onError]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center p-8 border border-red-200 rounded-lg bg-red-50">
        <div className="text-center">
          <p className="text-red-800 font-medium mb-2">Failed to load Google Maps</p>
          <p className="text-red-600 text-sm">{loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to check if Google Maps is loaded
 */
export function useGoogleMapsLoaded() {
  const [isLoaded, setIsLoaded] = useState(isGoogleMapsLoaded);

  useEffect(() => {
    if (isGoogleMapsLoaded) {
      setIsLoaded(true);
      return;
    }

    const checkInterval = setInterval(() => {
      if (window.google && window.google.maps) {
        isGoogleMapsLoaded = true;
        setIsLoaded(true);
        clearInterval(checkInterval);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, []);

  return isLoaded;
}

// Type declarations for Google Maps
declare global {
  interface Window {
    google: any;
  }
}
