import type { TripSummary } from '../types/trip';

interface TripCardProps {
  trip: TripSummary;
  onOpen: (trip: TripSummary) => void;
  onDelete?: (trip: TripSummary) => void;
  onShare?: (trip: TripSummary) => void;
  isShared?: boolean;
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const getDaysCount = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff;
};

const formatLastModified = (dateString: string | undefined) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateString);
};

export const TripCard = ({ trip, onOpen, onDelete, onShare, isShared }: TripCardProps) => {
  const days = getDaysCount(trip.startDate, trip.endDate);
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm(`Delete "${trip.name}"? This cannot be undone.`)) {
      onDelete(trip);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(trip);
  };

  return (
    <div className="trip-card" onClick={() => onOpen(trip)}>
      <div className="trip-card-header">
        {trip.coverImage ? (
          <img src={trip.coverImage} alt={trip.name} className="trip-cover" />
        ) : (
          <div className="trip-cover-placeholder">
            <span>{isShared ? '🤝' : '🗺️'}</span>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="trip-card-actions">
          {onShare && (
            <button 
              className="trip-action-btn" 
              onClick={handleShare}
              title="Share trip"
            >
              🔗
            </button>
          )}
          {onDelete && (
            <button 
              className="trip-action-btn trip-delete-btn" 
              onClick={handleDelete}
              title="Delete trip"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
      
      <div className="trip-card-body">
        <h3 className="trip-name">{trip.name}</h3>
        
        {/* Show owner for shared trips */}
        {isShared && trip.owner && (
          <p className="trip-owner">
            <span className="owner-label">by</span> {trip.owner}
          </p>
        )}
        
        {trip.description && (
          <p className="trip-description">{trip.description}</p>
        )}
        
        {/* Only show dates if they exist */}
        {trip.startDate && trip.endDate && (
          <div className="trip-meta">
            <span className="trip-dates">
              📅 {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </span>
            {days > 0 && (
              <span className="trip-duration">
                {days} {days === 1 ? 'day' : 'days'}
              </span>
            )}
          </div>
        )}
        
        <div className="trip-stats">
          {trip.destinationCount > 0 && (
            <span className="trip-destinations">
              📍 {trip.destinationCount} {trip.destinationCount === 1 ? 'place' : 'places'}
            </span>
          )}
          {trip.lastModified && (
            <span className="trip-modified">
              Updated {formatLastModified(trip.lastModified)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
