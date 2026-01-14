import { useState, useRef, useCallback } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';

interface PlaceSearchProps {
  onPlaceSelect: (place: {
    name: string;
    address: string;
    placeId: string;
    lat: number;
    lng: number;
  }) => void;
  placeholder?: string;
  className?: string;
}

export const PlaceSearch = ({ 
  onPlaceSelect, 
  placeholder = 'Search for a place...',
  className = ''
}: PlaceSearchProps) => {
  const [inputValue, setInputValue] = useState('');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useGoogleMaps();

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      
      if (place.geometry?.location) {
        onPlaceSelect({
          name: place.name || '',
          address: place.formatted_address || '',
          placeId: place.place_id || '',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
        setInputValue(place.name || '');
      }
    }
  }, [onPlaceSelect]);

  if (!isLoaded) {
    return (
      <input
        type="text"
        placeholder="Loading..."
        disabled
        className={`place-search-input ${className}`}
      />
    );
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        types: ['establishment', 'geocode'],
        fields: ['name', 'formatted_address', 'place_id', 'geometry'],
      }}
    >
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className={`place-search-input ${className}`}
      />
    </Autocomplete>
  );
};
