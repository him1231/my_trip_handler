import { Loader } from "@googlemaps/js-api-loader";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  address?: string;
  kind: "day" | "group" | "saved";
  color?: string;
};

type MapPanelProps = {
  markers: MapMarker[];
  onSelect: (selection: { lat: number; lng: number; name?: string; address?: string }) => void;
  canEdit: boolean;
  selectedLocation?: { lat: number; lng: number; name?: string; address?: string } | null;
  onClearSelected?: () => void;
  destination?: string;
  destinationPlaceId?: string;
  onDestinationPlaceId?: (placeId: string) => void;
};

const MapPanel = ({
  markers,
  onSelect,
  canEdit,
  selectedLocation,
  onClearSelected,
  destination,
  destinationPlaceId,
  onDestinationPlaceId
}: MapPanelProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const autocompleteContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const selectedMarkerRef = useRef<google.maps.Marker | null>(null);
  const selectedInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const lastSelectedKeyRef = useRef<string | null>(null);
  const lastGeocodedDestinationRef = useRef<string | null>(null);
  const lastPlaceIdRef = useRef<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const buildPinIcon = (color: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36"><path fill="${color}" d="M12 0C6.9 0 2.8 4.1 2.8 9.2c0 6.9 8.2 17.9 8.6 18.4.3.4.9.4 1.2 0 .3-.5 8.6-11.5 8.6-18.4C21.2 4.1 17.1 0 12 0zm0 13.4a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4z"/></svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(24, 36),
      anchor: new google.maps.Point(12, 36)
    };
  };

  const focusOnDestination = useCallback((address?: string, placeId?: string) => {
    if (!mapInstanceRef.current) {
      return;
    }
    const trimmed = address?.trim();
    if (!trimmed && !placeId) {
      return;
    }
    if (placeId && lastPlaceIdRef.current === placeId) {
      return;
    }
    if (!placeId && trimmed && lastGeocodedDestinationRef.current === trimmed) {
      return;
    }

    const map = mapInstanceRef.current;
    const geocoder = new google.maps.Geocoder();
    if (placeId) {
      geocoder.geocode({ placeId }, (results, status) => {
        if (status === "OK" && results?.[0]?.geometry?.location) {
          map.setCenter(results[0].geometry.location);
          map.setZoom(10);
          lastPlaceIdRef.current = placeId;
          return;
        }
        lastPlaceIdRef.current = null;
        if (trimmed) {
          focusOnDestination(trimmed, undefined);
        }
      });
      return;
    }

    if (!trimmed) {
      return;
    }

    geocoder.geocode({ address: trimmed }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        console.info("Map focus set", {
          destination: trimmed,
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
          placeId: results[0].place_id
        });
        map.setCenter(results[0].geometry.location);
        map.setZoom(10);
        lastGeocodedDestinationRef.current = trimmed;
        lastPlaceIdRef.current = results[0].place_id ?? null;
        if (results[0].place_id) {
          onDestinationPlaceId?.(results[0].place_id);
        }
        return;
      }

      console.warn("Geocode failed, falling back to Places", {
        destination: trimmed,
        status,
        results
      });

      const placesService = new google.maps.places.PlacesService(map);
      placesService.findPlaceFromQuery(
        {
          query: trimmed,
          fields: ["geometry", "name", "place_id"]
        },
        (placeResults, placeStatus) => {
          const location = placeResults?.[0]?.geometry?.location;
          if (placeStatus !== "OK" || !location) {
            console.warn("Places lookup failed", {
              destination: trimmed,
              placeStatus,
              placeResults
            });
            return;
          }
          console.info("Map focus set via Places", {
            destination: trimmed,
            lat: location.lat(),
            lng: location.lng(),
            placeId: placeResults?.[0]?.place_id
          });
          map.setCenter(location);
          map.setZoom(10);
          lastGeocodedDestinationRef.current = trimmed;
          lastPlaceIdRef.current = placeResults?.[0]?.place_id ?? null;
          if (placeResults?.[0]?.place_id) {
            onDestinationPlaceId?.(placeResults[0].place_id);
          }
        }
      );
    });
  }, [onDestinationPlaceId]);

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
        center: { lat: 20, lng: 0 },
        zoom: destination ? 5 : 2
      });

      mapInstanceRef.current = map;
      setMapReady(true);

      if (autocompleteContainerRef.current) {
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = canEdit ? "Search places or click on map" : "Search places";
        input.className =
          "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

        autocompleteContainerRef.current.replaceChildren(input);
        const autocomplete = new google.maps.places.Autocomplete(input, {
          fields: ["geometry", "name", "formatted_address", "place_id"]
        });
        autocomplete.bindTo("bounds", map);
        autocompleteRef.current = autocomplete;

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const location = place.geometry?.location;

          if (location) {
            map.panTo(location);
            map.setZoom(12);
            onSelect({
              lat: location.lat(),
              lng: location.lng(),
              name: place.name ?? undefined,
              address: place.formatted_address ?? undefined
            });
            return;
          }

          if (!place.place_id) {
            return;
          }

          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ placeId: place.place_id }, (results, status) => {
            const resolved = results?.[0]?.geometry?.location;
            if (status !== "OK" || !resolved) {
              return;
            }
            map.panTo(resolved);
            map.setZoom(12);
            onSelect({
              lat: resolved.lat(),
              lng: resolved.lng(),
              name: place.name ?? results?.[0]?.name ?? undefined,
              address: place.formatted_address ?? results?.[0]?.formatted_address ?? undefined
            });
          });
        });
      }

      map.addListener("click", (event: google.maps.MapMouseEvent) => {
        if (!event.latLng || !canEdit) {
          return;
        }
        onSelect({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      });

      if (destination || destinationPlaceId) {
        focusOnDestination(destination, destinationPlaceId);
      }
    });

    return () => {
      isMounted = false;
      setMapReady(false);
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.setMap(null);
        selectedMarkerRef.current = null;
      }
      if (selectedInfoWindowRef.current) {
        selectedInfoWindowRef.current.close();
        selectedInfoWindowRef.current = null;
      }
      if (autocompleteRef.current) {
        autocompleteRef.current.unbindAll();
        autocompleteRef.current = null;
      }
      if (autocompleteContainerRef.current) {
        autocompleteContainerRef.current.replaceChildren();
      }
    };
  }, [canEdit, destination, destinationPlaceId, focusOnDestination, onSelect]);

  useEffect(() => {
    if (!destination && !destinationPlaceId) {
      return;
    }
    focusOnDestination(destination, destinationPlaceId);
  }, [destination, destinationPlaceId, focusOnDestination]);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) {
      return;
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const kindColors: Record<MapMarker["kind"], string> = {
      day: "#2563eb",
      group: "#7c3aed",
      saved: "#6b7280"
    };

    markersRef.current = markers.map((markerItem) => {
      const marker = new google.maps.Marker({
        position: { lat: markerItem.lat, lng: markerItem.lng },
        map: mapInstanceRef.current,
        title: markerItem.name,
        icon: buildPinIcon(markerItem.color ?? kindColors[markerItem.kind])
      });
      marker.addListener("click", () => {
        onSelect({
          lat: markerItem.lat,
          lng: markerItem.lng,
          name: markerItem.name,
          address: markerItem.address
        });
      });
      return marker;
    });

    if (!selectedLocation && !destination && !destinationPlaceId && markers.length) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((markerItem) => bounds.extend({ lat: markerItem.lat, lng: markerItem.lng }));
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [destination, destinationPlaceId, mapReady, markers, onSelect, selectedLocation]);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      return;
    }

    const selectionKey = selectedLocation
      ? `${selectedLocation.lat}:${selectedLocation.lng}:${selectedLocation.name ?? ""}:${selectedLocation.address ?? ""}`
      : null;
    if (selectionKey && lastSelectedKeyRef.current === selectionKey) {
      return;
    }
    lastSelectedKeyRef.current = selectionKey;

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.setMap(null);
      selectedMarkerRef.current = null;
    }
    if (selectedInfoWindowRef.current) {
      selectedInfoWindowRef.current.close();
      selectedInfoWindowRef.current = null;
    }

    if (!selectedLocation) {
      return;
    }

    const marker = new google.maps.Marker({
      position: { lat: selectedLocation.lat, lng: selectedLocation.lng },
      map: mapInstanceRef.current,
      title: selectedLocation.name ?? "Selected location"
    });
    selectedMarkerRef.current = marker;

    mapInstanceRef.current.panTo({ lat: selectedLocation.lat, lng: selectedLocation.lng });
    mapInstanceRef.current.setZoom(12);

    const details = [selectedLocation.name, selectedLocation.address]
      .filter(Boolean)
      .join("<br />");
    const content = details || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`;
    const infoWindow = new google.maps.InfoWindow({ content });
    infoWindow.open({ map: mapInstanceRef.current, anchor: marker });
    infoWindow.addListener("closeclick", () => {
      onClearSelected?.();
    });
    selectedInfoWindowRef.current = infoWindow;
  }, [onClearSelected, selectedLocation]);

  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div ref={autocompleteContainerRef} className="w-full" />
        {canEdit ? <Badge variant="secondary">Editor</Badge> : <Badge variant="outline">Viewer</Badge>}
      </div>
      <div className="flex-1 overflow-hidden rounded-xl border">
        <div ref={mapRef} className="h-full min-h-[360px] w-full" />
      </div>
    </Card>
  );
};

export default MapPanel;
