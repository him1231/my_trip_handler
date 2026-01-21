import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef } from "react";
import { TripLocation } from "../lib/types";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

type MapPanelProps = {
  locations: TripLocation[];
  onSelect: (selection: { lat: number; lng: number; name?: string; address?: string }) => void;
  canEdit: boolean;
  destination?: string;
};

const MapPanel = ({ locations, onSelect, canEdit, destination }: MapPanelProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const lastGeocodedDestinationRef = useRef<string | null>(null);

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
    if (!mapInstanceRef.current || !destination) {
      return;
    }
    if (lastGeocodedDestinationRef.current === destination) {
      return;
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: destination }, (results, status) => {
      if (status !== "OK" || !results?.[0]?.geometry?.location || !mapInstanceRef.current) {
        return;
      }
      mapInstanceRef.current.setCenter(results[0].geometry.location);
      mapInstanceRef.current.setZoom(10);
      lastGeocodedDestinationRef.current = destination;
    });
  }, [destination]);

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
    <Card className="flex h-full flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          ref={inputRef}
          type="text"
          placeholder={canEdit ? "Search places or click on map" : "View-only map"}
          disabled={!canEdit}
        />
        {canEdit ? <Badge variant="secondary">Editor</Badge> : <Badge variant="outline">Viewer</Badge>}
      </div>
      <div className="flex-1 overflow-hidden rounded-xl border">
        <div ref={mapRef} className="min-h-[400px] w-full" />
      </div>
    </Card>
  );
};

export default MapPanel;
