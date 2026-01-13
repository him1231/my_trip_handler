---
name: google-apis
description: Google OAuth 2.0, Google Drive API, and Google Maps JavaScript API integration patterns. Use when implementing authentication, file storage, or map features.
---

# Google APIs Integration

## Overview

This skill covers client-side integration with Google APIs:
- **OAuth 2.0** - User authentication (PKCE flow, no client secret needed)
- **Google Drive API** - Store and retrieve trip data
- **Google Maps JavaScript API** - Interactive maps and places

## OAuth 2.0 (Client-Side PKCE)

### Why PKCE?
For client-side apps (like ours on GitHub Pages), we use the PKCE (Proof Key for Code Exchange) flow. This is secure without needing a client secret.

### Setup in Google Cloud Console
1. Create OAuth 2.0 Client ID (Web application)
2. Add authorized JavaScript origins:
   - `http://localhost:5173` (development)
   - `https://username.github.io` (production)
3. Add authorized redirect URIs:
   - Same as origins, plus `/my_trip_handler/`

### OAuth Hook Pattern

```typescript
// src/hooks/useGoogleAuth.ts
import { useState, useCallback, useEffect } from 'react';

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  accessToken: string;
}

export const useGoogleAuth = () => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const signIn = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Initialize Google Identity Services
      const client = google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
        callback: (response) => {
          if (response.error) {
            setError(new Error(response.error));
            return;
          }
          // Fetch user info with access token
          fetchUserInfo(response.access_token);
        },
      });
      client.requestAccessToken();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Sign in failed'));
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    google.accounts.oauth2.revoke(user?.accessToken ?? '');
  }, [user]);

  return { user, loading, error, signIn, signOut };
};
```

### Required OAuth Scopes

| Scope | Purpose |
|-------|---------|
| `openid` | Basic authentication |
| `email` | User's email address |
| `profile` | User's name and picture |
| `https://www.googleapis.com/auth/drive.file` | Access files created by this app only |

**Important**: Use `drive.file` scope, NOT `drive` - it's more restrictive and safer.

## Google Drive API

### Store Trip Data

```typescript
// src/services/googleDrive.ts
const FOLDER_NAME = 'My Trip Handler';

export const getOrCreateAppFolder = async (accessToken: string): Promise<string> => {
  // Check if folder exists
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchResponse.json();
  
  if (searchData.files?.length > 0) {
    return searchData.files[0].id;
  }
  
  // Create folder
  const createResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );
  const createData = await createResponse.json();
  return createData.id;
};

export const saveTrip = async (
  accessToken: string,
  folderId: string,
  trip: Trip
): Promise<string> => {
  const metadata = {
    name: `${trip.id}.json`,
    parents: [folderId],
    mimeType: 'application/json',
  };
  
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(trip)], { type: 'application/json' }));
  
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );
  
  const data = await response.json();
  return data.id;
};
```

### Drive Hook Pattern

```typescript
// src/hooks/useGoogleDrive.ts
export const useGoogleDrive = (accessToken: string | null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const saveTrip = useCallback(async (trip: Trip) => {
    if (!accessToken) {
      setError(new Error('Not authenticated'));
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const folderId = await getOrCreateAppFolder(accessToken);
      const fileId = await saveTripToFolder(accessToken, folderId, trip);
      return fileId;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [accessToken]);
  
  return { saveTrip, loading, error };
};
```

## Google Maps JavaScript API

### Load the API

```typescript
// src/hooks/useGoogleMaps.ts
import { useJsApiLoader } from '@react-google-maps/api';

const libraries: ("places" | "geometry")[] = ['places', 'geometry'];

export const useGoogleMaps = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });
  
  return { isLoaded, loadError };
};
```

### Map Component Pattern

```typescript
// src/components/TripMap.tsx
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px',
};

interface TripMapProps {
  center: google.maps.LatLngLiteral;
  markers: Array<{
    id: string;
    position: google.maps.LatLngLiteral;
    title: string;
  }>;
  onMarkerClick?: (markerId: string) => void;
}

export const TripMap = ({ center, markers, onMarkerClick }: TripMapProps) => {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  
  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
    >
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={marker.position}
          title={marker.title}
          onClick={() => {
            setSelectedMarker(marker.id);
            onMarkerClick?.(marker.id);
          }}
        />
      ))}
      
      {selectedMarker && (
        <InfoWindow
          position={markers.find(m => m.id === selectedMarker)?.position}
          onCloseClick={() => setSelectedMarker(null)}
        >
          <div>{markers.find(m => m.id === selectedMarker)?.title}</div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};
```

### Places Autocomplete

```typescript
// src/components/PlaceSearch.tsx
import { Autocomplete } from '@react-google-maps/api';

interface PlaceSearchProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
}

export const PlaceSearch = ({ onPlaceSelect }: PlaceSearchProps) => {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  
  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setAutocomplete(autocomplete);
  };
  
  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        onPlaceSelect(place);
      }
    }
  };
  
  return (
    <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
      <input
        type="text"
        placeholder="Search for a place..."
        className="w-full p-2 border rounded"
      />
    </Autocomplete>
  );
};
```

## Error Handling

### Token Expiration

```typescript
const handleApiError = async (response: Response, retryFn: () => Promise<any>) => {
  if (response.status === 401) {
    // Token expired - trigger re-authentication
    await refreshToken();
    return retryFn();
  }
  
  if (response.status === 403) {
    throw new Error('Permission denied. Please sign in again.');
  }
  
  if (response.status === 429) {
    throw new Error('Too many requests. Please wait a moment.');
  }
  
  throw new Error(`API error: ${response.status}`);
};
```

### Rate Limiting

```typescript
// Simple rate limiter for API calls
const rateLimiter = {
  lastCall: 0,
  minInterval: 100, // ms between calls
  
  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    if (timeSinceLastCall < this.minInterval) {
      await new Promise(r => setTimeout(r, this.minInterval - timeSinceLastCall));
    }
    
    this.lastCall = Date.now();
    return fn();
  }
};
```

## Security Checklist

- [ ] OAuth Client ID is in `.env` (NOT the secret)
- [ ] API keys are domain-restricted in Google Cloud Console
- [ ] Using `drive.file` scope (not full `drive` access)
- [ ] Tokens stored only in memory (not localStorage for access tokens)
- [ ] Handling token expiration gracefully
- [ ] Not exposing user data in URLs

## Integration with Other Skills

- **react-ui-patterns**: Loading states while fetching from APIs
- **testing-patterns**: Mock Google API responses in tests
- **systematic-debugging**: Debug OAuth flow issues
- **formik-patterns**: Trip creation forms
