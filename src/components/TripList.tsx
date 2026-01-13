import { useState } from 'react';
import type { TripSummary } from '../types/trip';
import { TripCard } from './TripCard';

type TabType = 'my-trips' | 'shared';

interface TripListProps {
  trips: TripSummary[];
  sharedTrips: TripSummary[];
  loading: boolean;
  loadingShared: boolean;
  onOpenTrip: (trip: TripSummary) => void;
  onDeleteTrip: (trip: TripSummary) => void;
  onCreateTrip: () => void;
  onShareTrip?: (trip: TripSummary) => void;
}

export const TripList = ({ 
  trips, 
  sharedTrips,
  loading, 
  loadingShared,
  onOpenTrip, 
  onDeleteTrip, 
  onCreateTrip,
  onShareTrip,
}: TripListProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('my-trips');

  const isLoadingCurrentTab = activeTab === 'my-trips' ? loading : loadingShared;
  const currentTrips = activeTab === 'my-trips' ? trips : sharedTrips;

  // Show full page loading only on initial load with no data
  if (loading && trips.length === 0 && activeTab === 'my-trips') {
    return (
      <div className="trip-list-loading">
        <div className="loading-spinner large" />
        <p>Loading your trips...</p>
      </div>
    );
  }

  return (
    <div className="trip-list">
      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'my-trips' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-trips')}
        >
          My Trips
          {trips.length > 0 && (
            <span className="tab-badge">{trips.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'shared' ? 'active' : ''}`}
          onClick={() => setActiveTab('shared')}
        >
          Shared with Me
          {sharedTrips.length > 0 && (
            <span className="tab-badge">{sharedTrips.length}</span>
          )}
        </button>
      </div>

      {/* Header with Create Button (only for My Trips) */}
      {activeTab === 'my-trips' && (
        <div className="trip-list-header">
          <h2>My Trips</h2>
          <button className="create-trip-btn" onClick={onCreateTrip}>
            ➕ New Trip
          </button>
        </div>
      )}

      {activeTab === 'shared' && (
        <div className="trip-list-header">
          <h2>Shared with Me</h2>
        </div>
      )}

      {/* Loading State */}
      {isLoadingCurrentTab && currentTrips.length === 0 && (
        <div className="trip-list-loading">
          <div className="loading-spinner large" />
          <p>{activeTab === 'my-trips' ? 'Loading your trips...' : 'Loading shared trips...'}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingCurrentTab && currentTrips.length === 0 && (
        <div className="trip-list-empty">
          <div className="empty-icon">{activeTab === 'my-trips' ? '🗺️' : '🤝'}</div>
          <h3>{activeTab === 'my-trips' ? 'No trips yet' : 'No shared trips'}</h3>
          <p>
            {activeTab === 'my-trips' 
              ? 'Create your first trip to get started!'
              : 'When someone shares a trip with you, it will appear here.'
            }
          </p>
          {activeTab === 'my-trips' && (
            <button className="create-trip-btn primary" onClick={onCreateTrip}>
              ➕ Create Trip
            </button>
          )}
        </div>
      )}

      {/* Trip Grid */}
      {currentTrips.length > 0 && (
        <div className="trip-grid">
          {currentTrips.map(trip => (
            <TripCard 
              key={trip.driveFileId} 
              trip={trip} 
              onOpen={onOpenTrip}
              onDelete={activeTab === 'my-trips' ? onDeleteTrip : undefined}
              onShare={activeTab === 'my-trips' ? onShareTrip : undefined}
              isShared={activeTab === 'shared'}
            />
          ))}
        </div>
      )}
    </div>
  );
};
