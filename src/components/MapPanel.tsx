import { Loader } from "@googlemaps/js-api-loader";
import { useCallback, useEffect, useRef } from "react";
import { TripLocation } from "../lib/types";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

type MapPanelProps = {
  locations: TripLocation[];
  onSelect: (selection: { lat: number; lng: number; name?: string; address?: string }) => void;
  canEdit: boolean;
  destination?: string;
  destinationPlaceId?: string;
  onDestinationPlaceId?: (placeId: string) => void;
};

const MapPanel = ({
  locations,
  onSelect,
  canEdit,
  destination,
  destinationPlaceId,
  onDestinationPlaceId
}: MapPanelProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const autocompleteContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const lastGeocodedDestinationRef = useRef<string | null>(null);
  const lastPlaceIdRef = useRef<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);

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

      if (autocompleteContainerRef.current) {
        const autocomplete = new google.maps.places.PlaceAutocompleteElement({});
        autocomplete.classList.add("w-full");
        autocomplete.setAttribute(
          "placeholder",
          canEdit ? "Search places or click on map" : "View-only map"
        );
        autocomplete.setAttribute("disabled", canEdit ? "false" : "true");
        autocompleteContainerRef.current.replaceChildren(autocomplete);
        autocompleteRef.current = autocomplete;

        autocomplete.addEventListener("gmp-placeselect", (event) => {
          const place = (event as CustomEvent).detail.place;
          if (!place?.location) {
            return;
          }
          map.panTo(place.location);
          map.setZoom(12);
          if (canEdit) {
            onSelect({
              lat: place.location.lat(),
              lng: place.location.lng(),
              name: place.displayName,
              address: place.formattedAddress
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

      if (destination || destinationPlaceId) {
        focusOnDestination(destination, destinationPlaceId);
      }
    });

    return () => {
      isMounted = false;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      if (autocompleteRef.current) {
        autocompleteRef.current.remove();
        autocompleteRef.current = null;
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
        <div ref={autocompleteContainerRef} className="w-full" />
        {canEdit ? <Badge variant="secondary">Editor</Badge> : <Badge variant="outline">Viewer</Badge>}
      </div>
      <div className="flex-1 overflow-hidden rounded-xl border">
        <div ref={mapRef} className="min-h-[400px] w-full" />
      </div>
    </Card>
  );
};

export default MapPanel;
