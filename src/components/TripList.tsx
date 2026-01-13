import type { TripSummary } from '../types/trip';
import { TripCard } from './TripCard';

interface TripListProps {
  trips: TripSummary[];
  loading: boolean;
  onOpenTrip: (trip: TripSummary) => void;
  onDeleteTrip: (trip: TripSummary) => void;
  onCreateTrip: () => void;
}

export const TripList = ({ 
  trips, 
  loading, 
  onOpenTrip, 
  onDeleteTrip, 
  onCreateTrip 
}: TripListProps) => {
  if (loading && trips.length === 0) {
    return (
      <div className="trip-list-loading">
        <div className="loading-spinner large" />
        <p>Loading your trips...</p>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="trip-list-empty">
        <div className="empty-icon">🗺️</div>
        <h3>No trips yet</h3>
        <p>Create your first trip to get started!</p>
        <button className="create-trip-btn primary" onClick={onCreateTrip}>
          ➕ Create Trip
        </button>
      </div>
    );
  }

  return (
    <div className="trip-list">
      <div className="trip-list-header">
        <h2>My Trips</h2>
        <button className="create-trip-btn" onClick={onCreateTrip}>
          ➕ New Trip
        </button>
      </div>
      
      <div className="trip-grid">
        {trips.map(trip => (
          <TripCard 
            key={trip.id} 
            trip={trip} 
            onOpen={onOpenTrip}
            onDelete={onDeleteTrip}
          />
        ))}
      </div>
    </div>
  );
};
