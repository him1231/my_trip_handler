import { useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import type { TripDestination } from '../types/trip';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px',
};

const defaultCenter = {
  lat: 35.6762, // Tokyo
  lng: 139.6503,
};

const DAY_COLORS = [
  '#FF0000', // Red
  '#0000FF', // Blue
  '#008000', // Green
  '#FFA500', // Orange
  '#800080', // Purple
  '#00FFFF', // Cyan
  '#FF00FF', // Magenta
  '#A52A2A', // Brown
];

interface TripMapProps {
  destinations: TripDestination[];
  pickingMode?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedDestinationId?: string | null;
}

export const TripMap = ({ 
  destinations, 
  pickingMode = false, 
  onLocationSelect,
  selectedDestinationId 
}: TripMapProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<TripDestination | null>(null);

  // Use map state to trigger re-renders or other effects if needed
  // This silencing of the unused var warning is temporary until we add map manipulation features
  // @ts-ignore
  const _mapInstance = map;

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    
    // Fit bounds to include all destinations
    if (destinations.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      let hasValidDestinations = false;
      
      destinations.forEach(dest => {
        if (dest.lat && dest.lng) {
          bounds.extend({ lat: dest.lat, lng: dest.lng });
          hasValidDestinations = true;
        }
      });
      
      if (hasValidDestinations) {
        map.fitBounds(bounds);
      }
    }
  }, [destinations]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (pickingMode && onLocationSelect && e.latLng) {
      onLocationSelect(e.latLng.lat(), e.latLng.lng());
    } else {
      setSelectedMarker(null);
    }
  }, [pickingMode, onLocationSelect]);

  // Group destinations by day for polylines
  const destinationsByDay = useMemo(() => {
    const grouped: Record<number, TripDestination[]> = {};
    destinations.forEach(dest => {
      const day = dest.day || 1;
      if (!grouped[day]) grouped[day] = [];
      if (dest.lat && dest.lng) {
        grouped[day].push(dest);
      }
    });
    // Sort by order
    Object.keys(grouped).forEach(day => {
      grouped[Number(day)].sort((a, b) => a.order - b.order);
    });
    return grouped;
  }, [destinations]);

  if (loadError) {
    return <div className="map-error">Error loading maps: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return (
      <div className="map-loading">
        <div className="loading-spinner large" />
        <p>Loading map...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={10}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleMapClick}
      options={{
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false, // Prevent clicking POIs from opening default info windows
        draggableCursor: pickingMode ? 'crosshair' : undefined,
      }}
    >
      {/* Markers */}
      {destinations.map((dest) => {
        if (!dest.lat || !dest.lng) return null;
        
        const isSelected = selectedDestinationId === dest.id;
        const color = DAY_COLORS[((dest.day || 1) - 1) % DAY_COLORS.length];
        
        return (
          <Marker
            key={dest.id}
            position={{ lat: dest.lat, lng: dest.lng }}
            onClick={() => {
              if (!pickingMode) {
                // e.stop() is not available on standard Marker click event from this library
                setSelectedMarker(dest);
              }
            }}
            label={{
              text: (dest.order + 1).toString(),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
            // Using standard markers for now, could customize icon later
            opacity={selectedDestinationId && !isSelected ? 0.6 : 1}
            animation={isSelected ? google.maps.Animation.BOUNCE : undefined}
          />
        );
      })}

      {/* Info Window */}
      {selectedMarker && (
        <InfoWindow
          position={{ lat: selectedMarker.lat!, lng: selectedMarker.lng! }}
          onCloseClick={() => setSelectedMarker(null)}
        >
          <div className="map-info-window">
            <h3>{selectedMarker.name}</h3>
            <p className="info-day">Day {selectedMarker.day}</p>
            {selectedMarker.address && <p className="info-address">{selectedMarker.address}</p>}
            {selectedMarker.notes && <p className="info-notes">{selectedMarker.notes}</p>}
          </div>
        </InfoWindow>
      )}

      {/* Polylines for routes */}
      {!pickingMode && Object.entries(destinationsByDay).map(([day, dests]) => {
        if (dests.length < 2) return null;
        
        const path = dests.map(d => ({ lat: d.lat!, lng: d.lng! }));
        const color = DAY_COLORS[(Number(day) - 1) % DAY_COLORS.length];
        
        return (
          <Polyline
            key={`route-day-${day}`}
            path={path}
            options={{
              strokeColor: color,
              strokeOpacity: 0.8,
              strokeWeight: 4,
              geodesic: true,
              icons: [{
                icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                offset: '100%',
                repeat: '100px'
              }]
            }}
          />
        );
      })}
    </GoogleMap>
  );
};
