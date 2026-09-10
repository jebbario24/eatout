import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';
import { useGoogleMapsLoaded } from '@/components/GoogleMapsLoader';

interface AddressAutocompleteProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onAddressSelect: (address: {
    formattedAddress: string;
    lat: number;
    lng: number;
    placeId: string;
    streetNumber?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  }) => void;
  onInputChange?: (value: string) => void;
  types?: string[]; // e.g., ['address'], ['establishment'], ['geocode']
  componentRestrictions?: { country: string | string[] };
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

/**
 * Address Autocomplete Component using Google Places API
 * Provides real-time address suggestions as user types
 */
export function AddressAutocomplete({
  label,
  placeholder = 'Start typing an address...',
  value,
  onAddressSelect,
  onInputChange,
  types = ['address'],
  componentRestrictions,
  disabled = false,
  required = false,
  error,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);
  const isGoogleMapsLoaded = useGoogleMapsLoaded();

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (!isGoogleMapsLoaded || !inputRef.current || autocompleteRef.current) {
      return;
    }

    try {
      // Create autocomplete instance
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types,
        componentRestrictions,
        fields: [
          'address_components',
          'formatted_address',
          'geometry',
          'place_id',
          'name',
          'plus_code',
        ],
      });

      // Listen for place selection
      autocomplete.addListener('place_changed', () => {
        setIsLoading(true);
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.geometry.location) {
          console.error('No location data for selected place');
          setIsLoading(false);
          return;
        }

        // Parse address components
        const addressComponents: { [key: string]: string } = {};
        place.address_components?.forEach((component) => {
          const types = component.types;
          if (types.includes('street_number')) {
            addressComponents.streetNumber = component.long_name;
          }
          if (types.includes('route')) {
            addressComponents.street = component.long_name;
          }
          if (types.includes('locality')) {
            addressComponents.city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            addressComponents.state = component.short_name;
          }
          if (types.includes('country')) {
            addressComponents.country = component.long_name;
          }
          if (types.includes('postal_code')) {
            addressComponents.postalCode = component.long_name;
          }
        });

        // Call callback with structured data
        onAddressSelect({
          formattedAddress: place.formatted_address || '',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          placeId: place.place_id || '',
          streetNumber: addressComponents.streetNumber,
          street: addressComponents.street,
          city: addressComponents.city,
          state: addressComponents.state,
          country: addressComponents.country,
          postalCode: addressComponents.postalCode,
        });

        setInputValue(place.formatted_address || '');
        setIsLoading(false);
      });

      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error('Failed to initialize Places Autocomplete:', error);
    }
  }, [isGoogleMapsLoaded, types, componentRestrictions, onAddressSelect]);

  // Update input value when prop changes
  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onInputChange?.(newValue);
  };

  if (!isGoogleMapsLoaded) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <div className="relative">
          <Input
            placeholder="Loading Google Maps..."
            disabled
            className="pl-10"
          />
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={inputRef.current?.id}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          required={required}
          className={`pl-10 ${error ? 'border-destructive' : ''}`}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Start typing to see address suggestions
      </p>
    </div>
  );
}

/**
 * Geocode an address string to coordinates
 * Useful for addresses entered without autocomplete
 */
export async function geocodeAddress(address: string): Promise<{
  lat: number;
  lng: number;
  formattedAddress: string;
} | null> {
  if (!window.google) {
    console.error('Google Maps not loaded');
    return null;
  }

  const geocoder = new google.maps.Geocoder();

  try {
    const result = await geocoder.geocode({ address });
    
    if (result.results && result.results.length > 0) {
      const location = result.results[0].geometry.location;
      return {
        lat: location.lat(),
        lng: location.lng(),
        formattedAddress: result.results[0].formatted_address,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 * Useful for getting address from GPS location
 */
export async function reverseGeocodeLocation(
  lat: number,
  lng: number
): Promise<string | null> {
  if (!window.google) {
    console.error('Google Maps not loaded');
    return null;
  }

  const geocoder = new google.maps.Geocoder();

  try {
    const result = await geocoder.geocode({
      location: { lat, lng },
    });
    
    if (result.results && result.results.length > 0) {
      return result.results[0].formatted_address;
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}
