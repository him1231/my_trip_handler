/**
 * Service for importing locations from Google Maps list share links
 * 
 * Note: Google Maps doesn't provide a direct API for accessing shared lists.
 * This service attempts to parse share URLs and extract place information,
 * then uses Google Places API to get full details.
 */

export interface GoogleMapsListPlace {
  placeId?: string;
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface ParsedGoogleMapsList {
  places: GoogleMapsListPlace[];
  listId?: string;
  listName?: string;
}

/**
 * Parse Google Maps share URL to extract place information
 * 
 * Google Maps share URLs can be in various formats:
 * - https://www.google.com/maps/@?api=1&map_action=map&center=...
 * - https://www.google.com/maps/@{lat},{lng},{zoom}z/data=!4m3!11m2!2s{placeId}...
 * - https://maps.google.com/?cid={cid}
 */
export const parseGoogleMapsUrl = (url: string): ParsedGoogleMapsList => {
  const places: GoogleMapsListPlace[] = [];
  
  try {
    const urlObj = new URL(url);
    
    // Try to extract place ID from data parameter
    // Format: data=!4m3!11m2!2s{placeId}...
    const dataParam = urlObj.searchParams.get('data');
    if (dataParam) {
      const placeIdMatch = dataParam.match(/!2s([^!]+)/);
      if (placeIdMatch && placeIdMatch[1]) {
        places.push({ placeId: placeIdMatch[1] });
      }
    }
    
    // Try to extract from pathname
    // Format: /@{lat},{lng},{zoom}z/data=!4m3!11m2!2s{placeId}...
    const pathMatch = url.match(/@([^,]+),([^,]+),([^z]+)z\/data=([^/]+)/);
    if (pathMatch) {
      const lat = parseFloat(pathMatch[1]);
      const lng = parseFloat(pathMatch[2]);
      const data = decodeURIComponent(pathMatch[4]);
      const placeIdMatch = data.match(/!2s([^!]+)/);
      
      if (placeIdMatch && placeIdMatch[1]) {
        places.push({
          placeId: placeIdMatch[1],
          lat,
          lng,
        });
      } else if (!isNaN(lat) && !isNaN(lng)) {
        places.push({ lat, lng });
      }
    }
    
    // Try to extract center coordinates
    const center = urlObj.searchParams.get('center');
    if (center) {
      const [lat, lng] = center.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        places.push({ lat, lng });
      }
    }
    
    // Try to extract CID (Customer ID)
    const cid = urlObj.searchParams.get('cid');
    if (cid) {
      places.push({ placeId: cid });
    }
    
    // Try to extract place ID from query parameter
    const placeId = urlObj.searchParams.get('place_id') || urlObj.searchParams.get('q');
    if (placeId && placeId.startsWith('ChIJ')) {
      // Google Place IDs typically start with ChIJ
      places.push({ placeId });
    }
    
  } catch (error) {
    console.error('Failed to parse Google Maps URL:', error);
  }
  
  return { places };
};

/**
 * Extract place IDs from a text that might contain multiple Google Maps URLs
 */
export const extractPlaceIdsFromText = (text: string): string[] => {
  const placeIds: string[] = [];
  
  // Match Google Maps URLs
  const urlRegex = /https?:\/\/(www\.)?(google\.com\/maps|maps\.google\.com)[^\s]+/gi;
  const urls = text.match(urlRegex) || [];
  
  urls.forEach(url => {
    const parsed = parseGoogleMapsUrl(url);
    parsed.places.forEach(place => {
      if (place.placeId && !placeIds.includes(place.placeId)) {
        placeIds.push(place.placeId);
      }
    });
  });
  
  // Also try to extract standalone place IDs (ChIJ...)
  const placeIdRegex = /ChIJ[\w-]+/g;
  const standaloneIds = text.match(placeIdRegex) || [];
  standaloneIds.forEach(id => {
    if (!placeIds.includes(id)) {
      placeIds.push(id);
    }
  });
  
  return placeIds;
};

/**
 * Get place details using Google Places API
 */
export const getPlaceDetails = (
  placeId: string,
  placesService: google.maps.places.PlacesService
): Promise<google.maps.places.PlaceResult> => {
  return new Promise((resolve, reject) => {
    placesService.getDetails(
      {
        placeId,
        fields: [
          'name',
          'formatted_address',
          'geometry',
          'place_id',
          'types',
          'rating',
          'user_ratings_total',
          'photos',
        ],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place);
        } else {
          reject(new Error(`Failed to get place details: ${status}`));
        }
      }
    );
  });
};

/**
 * Get place details by coordinates using reverse geocoding
 */
export const getPlaceDetailsByCoordinates = (
  lat: number,
  lng: number,
  geocoder: google.maps.Geocoder
): Promise<google.maps.GeocoderResult> => {
  return new Promise((resolve, reject) => {
    geocoder.geocode(
      { location: { lat, lng } },
      (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          resolve(results[0]);
        } else {
          reject(new Error(`Failed to geocode: ${status}`));
        }
      }
    );
  });
};

/**
 * Import places from Google Maps list URL
 * 
 * This function:
 * 1. Parses the URL to extract place information
 * 2. Uses Google Places API to get full details
 * 3. Returns formatted destinations ready to import
 */
export const importPlacesFromUrl = async (
  url: string,
  placesService: google.maps.places.PlacesService,
  geocoder: google.maps.Geocoder
): Promise<Array<{
  name: string;
  address: string;
  placeId?: string;
  lat: number;
  lng: number;
  notes?: string;
}>> => {
  const parsed = parseGoogleMapsUrl(url);
  const importedPlaces: Array<{
    name: string;
    address: string;
    placeId?: string;
    lat: number;
    lng: number;
    notes?: string;
  }> = [];
  
  for (const place of parsed.places) {
    try {
      let placeDetails: google.maps.places.PlaceResult | google.maps.GeocoderResult | null = null;
      
      if (place.placeId) {
        // Get details by place ID
        placeDetails = await getPlaceDetails(place.placeId, placesService);
      } else if (place.lat && place.lng) {
        // Get details by coordinates
        const geocodeResult = await getPlaceDetailsByCoordinates(place.lat, place.lng, geocoder);
        placeDetails = geocodeResult as unknown as google.maps.places.PlaceResult;
      }
      
      if (placeDetails) {
        const geometry = 'geometry' in placeDetails 
          ? placeDetails.geometry 
          : { location: { lat: () => place.lat || 0, lng: () => place.lng || 0 } };
        
        const location = geometry?.location;
        if (location) {
          importedPlaces.push({
            name: ('name' in placeDetails ? placeDetails.name : placeDetails.formatted_address) || 'Unknown Place',
            address: 'formatted_address' in placeDetails 
              ? placeDetails.formatted_address || ''
              : placeDetails.formatted_address || '',
            placeId: 'place_id' in placeDetails ? placeDetails.place_id : place.placeId,
            lat: typeof location.lat === 'function' ? location.lat() : location.lat,
            lng: typeof location.lng === 'function' ? location.lng() : location.lng,
            notes: 'rating' in placeDetails && placeDetails.rating
              ? `Rating: ${placeDetails.rating}/5 (${placeDetails.user_ratings_total || 0} reviews)`
              : undefined,
          });
        }
      }
    } catch (error) {
      console.error('Failed to import place:', place, error);
      // Continue with next place even if one fails
    }
  }
  
  return importedPlaces;
};

/**
 * Store sync configuration for a Google Maps list
 */
export interface GoogleMapsListSync {
  tripId: string;
  listUrl: string;
  listId?: string;
  lastSynced?: string;
  syncedPlaceIds: string[];
}

const SYNC_STORAGE_KEY = 'google_maps_list_syncs';

/**
 * Save sync configuration
 */
export const saveSyncConfig = (sync: GoogleMapsListSync): void => {
  try {
    const syncs = getSyncConfigs();
    const existingIndex = syncs.findIndex(s => s.tripId === sync.tripId);
    
    if (existingIndex >= 0) {
      syncs[existingIndex] = sync;
    } else {
      syncs.push(sync);
    }
    
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(syncs));
  } catch (error) {
    console.error('Failed to save sync config:', error);
  }
};

/**
 * Get sync configuration for a trip
 */
export const getSyncConfig = (tripId: string): GoogleMapsListSync | null => {
  const syncs = getSyncConfigs();
  return syncs.find(s => s.tripId === tripId) || null;
};

/**
 * Get all sync configurations
 */
export const getSyncConfigs = (): GoogleMapsListSync[] => {
  try {
    const stored = localStorage.getItem(SYNC_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Remove sync configuration
 */
export const removeSyncConfig = (tripId: string): void => {
  try {
    const syncs = getSyncConfigs();
    const filtered = syncs.filter(s => s.tripId !== tripId);
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove sync config:', error);
  }
};
