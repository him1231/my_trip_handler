import { useState, useCallback, useEffect } from 'react';
import type { Trip, TripSummary } from '../types/trip';
import {
  getOrCreateAppFolder,
  saveTrip as saveTripToApi,
  loadTrips as loadTripsFromApi,
  loadTripById,
  deleteTrip as deleteTripFromApi,
} from '../services/googleDrive';

interface UseGoogleDriveReturn {
  trips: TripSummary[];
  loading: boolean;
  error: Error | null;
  folderId: string | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  saveTrip: (trip: Trip) => Promise<string | null>;
  loadTrip: (fileId: string) => Promise<Trip | null>;
  deleteTrip: (fileId: string) => Promise<boolean>;
  refreshTrips: () => Promise<void>;
}

export const useGoogleDrive = (accessToken: string | null): UseGoogleDriveReturn => {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize Drive (get/create app folder)
  const initialize = useCallback(async () => {
    if (!accessToken) {
      setError(new Error('Not authenticated'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const id = await getOrCreateAppFolder(accessToken);
      setFolderId(id);
      setInitialized(true);
      
      // Load trips after initialization
      const loadedTrips = await loadTripsFromApi(accessToken, id);
      setTrips(loadedTrips);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize Drive'));
      setInitialized(false);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Refresh trips list
  const refreshTrips = useCallback(async () => {
    if (!accessToken || !folderId) return;

    setLoading(true);
    setError(null);

    try {
      const loadedTrips = await loadTripsFromApi(accessToken, folderId);
      setTrips(loadedTrips);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load trips'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, folderId]);

  // Save a trip
  const saveTrip = useCallback(async (trip: Trip): Promise<string | null> => {
    if (!accessToken || !folderId) {
      setError(new Error('Drive not initialized'));
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const fileId = await saveTripToApi(accessToken, folderId, trip);
      
      // Refresh trips list
      await refreshTrips();
      
      return fileId;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save trip'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [accessToken, folderId, refreshTrips]);

  // Load a single trip
  const loadTrip = useCallback(async (fileId: string): Promise<Trip | null> => {
    if (!accessToken) {
      setError(new Error('Not authenticated'));
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const trip = await loadTripById(accessToken, fileId);
      return trip;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load trip'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Delete a trip
  const deleteTrip = useCallback(async (fileId: string): Promise<boolean> => {
    if (!accessToken) {
      setError(new Error('Not authenticated'));
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await deleteTripFromApi(accessToken, fileId);
      
      // Remove from local state
      setTrips(prev => prev.filter(t => t.driveFileId !== fileId));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete trip'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Auto-initialize when access token is available
  useEffect(() => {
    if (accessToken && !initialized && !loading) {
      initialize();
    }
  }, [accessToken, initialized, loading, initialize]);

  // Reset state when access token is cleared
  useEffect(() => {
    if (!accessToken) {
      setTrips([]);
      setFolderId(null);
      setInitialized(false);
      setError(null);
    }
  }, [accessToken]);

  return {
    trips,
    loading,
    error,
    folderId,
    initialized,
    initialize,
    saveTrip,
    loadTrip,
    deleteTrip,
    refreshTrips,
  };
};
