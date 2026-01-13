import type { TripSummary } from '../types/trip';

interface TripCardProps {
  trip: TripSummary;
  onOpen: (trip: TripSummary) => void;
  onDelete: (trip: TripSummary) => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const getDaysCount = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff;
};

export const TripCard = ({ trip, onOpen, onDelete }: TripCardProps) => {
  const days = getDaysCount(trip.startDate, trip.endDate);
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${trip.name}"? This cannot be undone.`)) {
      onDelete(trip);
    }
  };

  return (
    <div className="trip-card" onClick={() => onOpen(trip)}>
      <div className="trip-card-header">
        {trip.coverImage ? (
          <img src={trip.coverImage} alt={trip.name} className="trip-cover" />
        ) : (
          <div className="trip-cover-placeholder">
            <span>🗺️</span>
          </div>
        )}
        <button 
          className="trip-delete-btn" 
          onClick={handleDelete}
          title="Delete trip"
        >
          🗑️
        </button>
      </div>
      
      <div className="trip-card-body">
        <h3 className="trip-name">{trip.name}</h3>
        {trip.description && (
          <p className="trip-description">{trip.description}</p>
        )}
        
        <div className="trip-meta">
          <span className="trip-dates">
            📅 {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
          </span>
          <span className="trip-duration">
            {days} {days === 1 ? 'day' : 'days'}
          </span>
        </div>
        
        <div className="trip-stats">
          <span className="trip-destinations">
            📍 {trip.destinationCount} {trip.destinationCount === 1 ? 'place' : 'places'}
          </span>
        </div>
      </div>
    </div>
  );
};
