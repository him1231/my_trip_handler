import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef } from "react";
import { TripLocation } from "../lib/types";

type MapPanelProps = {
  locations: TripLocation[];
  onSelect: (selection: { lat: number; lng: number; name?: string; address?: string }) => void;
  canEdit: boolean;
};

const MapPanel = ({ locations, onSelect, canEdit }: MapPanelProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
      libraries: ["places"]
    });

    loader.load().then(() => {
      if (!isMounted || !mapRef.current) {
        return;
      }

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 35.681236, lng: 139.767125 },
        zoom: 5
      });

      mapInstanceRef.current = map;

      if (inputRef.current) {
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ["geometry", "formatted_address", "name"]
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) {
            return;
          }
          map.panTo(place.geometry.location);
          map.setZoom(12);
          if (canEdit) {
            onSelect({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              name: place.name,
              address: place.formatted_address
            });
          }
        });
      }

      map.addListener("click", (event: google.maps.MapMouseEvent) => {
        if (!event.latLng || !canEdit) {
          return;
        }
        onSelect({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      });
    });

    return () => {
      isMounted = false;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [canEdit, onSelect]);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      return;
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    markersRef.current = locations.map(
      (location) =>
        new google.maps.Marker({
          position: { lat: location.lat, lng: location.lng },
          map: mapInstanceRef.current,
          title: location.name
        })
    );
  }, [locations]);

  return (
    <div className="map-panel card">
      <div className="inline-actions">
        <input
          ref={inputRef}
          type="text"
          placeholder={canEdit ? "Search places or click on map" : "View-only map"}
          disabled={!canEdit}
        />
        {canEdit ? <span className="tag">Editor</span> : <span className="tag">Viewer</span>}
      </div>
      <div className="map-container">
        <div ref={mapRef} className="map-canvas" />
      </div>
    </div>
  );
};

export default MapPanel;
