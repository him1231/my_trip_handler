import { useState, useEffect } from 'react';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import {
  importPlacesFromUrl,
  getSyncConfig,
  saveSyncConfig,
  removeSyncConfig,
  type GoogleMapsListSync,
} from '../services/googleMapsListService';
import type { TripDestination } from '../types/trip';

interface GoogleMapsListImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (destinations: Omit<TripDestination, 'id' | 'order'>[]) => void;
  tripId?: string;
  existingDestinations?: TripDestination[];
}

export const GoogleMapsListImport = ({
  isOpen,
  onClose,
  onImport,
  tripId,
  existingDestinations = [],
}: GoogleMapsListImportProps) => {
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedPlaces, setImportedPlaces] = useState<Array<{
    name: string;
    address: string;
    placeId?: string;
    lat: number;
    lng: number;
    notes?: string;
  }>>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<number>>(new Set());
  const [enableSync, setEnableSync] = useState(false);
  const [syncConfig, setSyncConfig] = useState<GoogleMapsListSync | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { isLoaded } = useGoogleMaps();

  // Load existing sync config
  useEffect(() => {
    if (tripId) {
      const config = getSyncConfig(tripId);
      if (config) {
        setSyncConfig(config);
        setUrl(config.listUrl);
        setEnableSync(true);
      }
    }
  }, [tripId]);

  const handleImport = async () => {
    if (!url.trim()) {
      setError('Please enter a Google Maps share URL');
      return;
    }

    if (!isLoaded) {
      setError('Google Maps API is not loaded yet');
      return;
    }

    setImporting(true);
    setError(null);
    setImportedPlaces([]);
    setSelectedPlaces(new Set());

    try {
      // Create PlacesService and Geocoder
      const mapDiv = document.createElement('div');
      const map = new google.maps.Map(mapDiv);
      const placesService = new google.maps.places.PlacesService(map);
      const geocoder = new google.maps.Geocoder();

      const places = await importPlacesFromUrl(url, placesService, geocoder);

      if (places.length === 0) {
        setError('No places found in the URL. Make sure it\'s a valid Google Maps share link.');
        return;
      }

      setImportedPlaces(places);
      // Select all by default
      setSelectedPlaces(new Set(places.map((_, index) => index)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import places');
    } finally {
      setImporting(false);
    }
  };

  const handleTogglePlace = (index: number) => {
    const newSelected = new Set(selectedPlaces);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPlaces(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPlaces.size === importedPlaces.length) {
      setSelectedPlaces(new Set());
    } else {
      setSelectedPlaces(new Set(importedPlaces.map((_, index) => index)));
    }
  };

  const handleConfirmImport = () => {
    const selected = Array.from(selectedPlaces)
      .map(index => importedPlaces[index])
      .filter(Boolean);

    if (selected.length === 0) {
      setError('Please select at least one place to import');
      return;
    }

    // Convert to destinations (day 1 by default, user can reorganize later)
    const destinations = selected.map((place, index) => ({
      name: place.name,
      address: place.address,
      placeId: place.placeId,
      lat: place.lat,
      lng: place.lng,
      day: 1,
      notes: place.notes,
    }));

    onImport(destinations);

    // Save sync config if enabled
    if (enableSync && tripId) {
      const sync: GoogleMapsListSync = {
        tripId,
        listUrl: url,
        lastSynced: new Date().toISOString(),
        syncedPlaceIds: selected.map(p => p.placeId || '').filter(Boolean),
      };
      saveSyncConfig(sync);
      setSyncConfig(sync);
    } else if (!enableSync && tripId && syncConfig) {
      removeSyncConfig(tripId);
      setSyncConfig(null);
    }

    // Reset and close
    setUrl('');
    setImportedPlaces([]);
    setSelectedPlaces(new Set());
    onClose();
  };

  const handleSyncNow = async () => {
    if (!tripId || !syncConfig) return;

    setSyncing(true);
    setError(null);

    try {
      if (!isLoaded) {
        throw new Error('Google Maps API is not loaded yet');
      }

      const mapDiv = document.createElement('div');
      const map = new google.maps.Map(mapDiv);
      const placesService = new google.maps.places.PlacesService(map);
      const geocoder = new google.maps.Geocoder();

      const places = await importPlacesFromUrl(syncConfig.listUrl, placesService, geocoder);

      // Find new places that aren't in existing destinations
      const existingPlaceIds = new Set(
        existingDestinations
          .map(d => d.placeId)
          .filter((id): id is string => !!id)
      );

      const newPlaces = places.filter(
        p => p.placeId && !existingPlaceIds.has(p.placeId)
      );

      if (newPlaces.length > 0) {
        const destinations = newPlaces.map((place, index) => ({
          name: place.name,
          address: place.address,
          placeId: place.placeId,
          lat: place.lat,
          lng: place.lng,
          day: 1,
          notes: place.notes,
        }));

        onImport(destinations);

        // Update sync config
        const updatedSync: GoogleMapsListSync = {
          ...syncConfig,
          lastSynced: new Date().toISOString(),
          syncedPlaceIds: places.map(p => p.placeId || '').filter(Boolean),
        };
        saveSyncConfig(updatedSync);
        setSyncConfig(updatedSync);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleRemoveSync = () => {
    if (tripId) {
      removeSyncConfig(tripId);
      setSyncConfig(null);
      setEnableSync(false);
      setUrl('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import from Google Maps List</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          {/* Existing Sync Status */}
          {syncConfig && (
            <div className="sync-status">
              <div className="sync-status-header">
                <span className="sync-status-label">✅ Synced List</span>
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={handleSyncNow}
                  disabled={syncing || !isLoaded}
                >
                  {syncing ? 'Syncing...' : '🔄 Sync Now'}
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={handleRemoveSync}
                >
                  Remove Sync
                </button>
              </div>
              <p className="sync-status-url">{syncConfig.listUrl}</p>
              {syncConfig.lastSynced && (
                <p className="sync-status-time">
                  Last synced: {new Date(syncConfig.lastSynced).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* URL Input */}
          <div className="form-group">
            <label htmlFor="maps-url">Google Maps Share URL</label>
            <input
              id="maps-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.google.com/maps/..."
              disabled={importing || !!syncConfig}
              className="maps-url-input"
            />
            <p className="form-hint">
              Paste a Google Maps share link. You can share a list, place, or location.
            </p>
          </div>

          {/* Enable Sync Checkbox */}
          {tripId && !syncConfig && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={enableSync}
                  onChange={(e) => setEnableSync(e.target.checked)}
                />
                <span>Enable real-time sync (check for updates periodically)</span>
              </label>
            </div>
          )}

          {/* Import Button */}
          {!syncConfig && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleImport}
              disabled={importing || !url.trim() || !isLoaded}
            >
              {importing ? (
                <>
                  <span className="loading-spinner small" />
                  Importing...
                </>
              ) : (
                'Import Places'
              )}
            </button>
          )}

          {/* Imported Places List */}
          {importedPlaces.length > 0 && (
            <div className="imported-places">
              <div className="imported-places-header">
                <h3>Select Places to Import ({selectedPlaces.size} selected)</h3>
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={handleSelectAll}
                >
                  {selectedPlaces.size === importedPlaces.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="imported-places-list">
                {importedPlaces.map((place, index) => (
                  <div
                    key={index}
                    className={`imported-place-card ${selectedPlaces.has(index) ? 'selected' : ''}`}
                    onClick={() => handleTogglePlace(index)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlaces.has(index)}
                      onChange={() => handleTogglePlace(index)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="imported-place-info">
                      <h4>{place.name}</h4>
                      <p className="imported-place-address">{place.address}</p>
                      {place.notes && (
                        <p className="imported-place-notes">{place.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setImportedPlaces([]);
                    setSelectedPlaces(new Set());
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConfirmImport}
                  disabled={selectedPlaces.size === 0}
                >
                  Import {selectedPlaces.size} Place{selectedPlaces.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
