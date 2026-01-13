import { useState, useCallback, useEffect, useRef } from 'react';
import { getFileMetadata } from '../services/shareService';
import { loadTripById } from '../services/googleDrive';
import type { Trip } from '../types/trip';

const DEFAULT_SYNC_INTERVAL = 15000; // 15 seconds

interface UseAutoSyncOptions {
  accessToken: string | null;
  fileId: string | null;
  enabled?: boolean;
  interval?: number;
  onUpdate?: (trip: Trip) => void;
  onConflict?: (localTrip: Trip, remoteTripModifiedTime: string) => void;
}

interface UseAutoSyncReturn {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastModifiedTime: string | null;
  error: Error | null;
  syncNow: () => Promise<void>;
  setLocalModifiedTime: (time: string) => void;
}

export const useAutoSync = ({
  accessToken,
  fileId,
  enabled = true,
  interval = DEFAULT_SYNC_INTERVAL,
  onUpdate,
  onConflict,
}: UseAutoSyncOptions): UseAutoSyncReturn => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastModifiedTime, setLastModifiedTime] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Track local modification time to detect conflicts
  const localModifiedTimeRef = useRef<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Set local modified time (call this when user makes changes)
  const setLocalModifiedTime = useCallback((time: string) => {
    localModifiedTimeRef.current = time;
  }, []);

  // Check for remote changes and sync
  const syncNow = useCallback(async () => {
    if (!accessToken || !fileId) return;

    setIsSyncing(true);
    setError(null);

    try {
      // Get remote file metadata
      const metadata = await getFileMetadata(accessToken, fileId);
      const remoteModifiedTime = metadata.modifiedTime;

      // Check if remote has changed since our last known state
      if (lastModifiedTime && remoteModifiedTime !== lastModifiedTime) {
        // Check for conflict - did we also modify locally?
        if (localModifiedTimeRef.current && localModifiedTimeRef.current > lastModifiedTime) {
          // Conflict: both local and remote have changes
          if (onConflict) {
            const localTrip = await loadTripById(accessToken, fileId);
            if (localTrip) {
              onConflict(localTrip, remoteModifiedTime);
            }
          }
        } else {
          // No conflict - just fetch the new data
          const updatedTrip = await loadTripById(accessToken, fileId);
          if (updatedTrip && onUpdate) {
            onUpdate(updatedTrip);
          }
        }
      }

      setLastModifiedTime(remoteModifiedTime);
      setLastSyncTime(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Sync failed'));
    } finally {
      setIsSyncing(false);
    }
  }, [accessToken, fileId, lastModifiedTime, onUpdate, onConflict]);

  // Initial sync when file changes
  useEffect(() => {
    if (accessToken && fileId && enabled) {
      // Reset state for new file
      setLastModifiedTime(null);
      localModifiedTimeRef.current = null;
      
      // Initial sync
      syncNow();
    }
  }, [accessToken, fileId, enabled]); // Don't include syncNow to avoid loop

  // Set up polling interval
  useEffect(() => {
    if (!accessToken || !fileId || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling
    intervalRef.current = window.setInterval(() => {
      syncNow();
    }, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [accessToken, fileId, enabled, interval, syncNow]);

  return {
    isSyncing,
    lastSyncTime,
    lastModifiedTime,
    error,
    syncNow,
    setLocalModifiedTime,
  };
};
