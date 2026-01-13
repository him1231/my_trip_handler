import type { TripFlight } from '../types/flight';
import { formatFlightTime, getFlightStatusColor } from '../services/flightService';

interface FlightCardProps {
  flight: TripFlight;
  onEdit?: (flight: TripFlight) => void;
  onDelete?: (flightId: string) => void;
}

export const FlightCard = ({ flight, onEdit, onDelete }: FlightCardProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={`flight-card ${flight.type}`}>
      <div className="flight-card-header">
        <div className="flight-type-badge">
          {flight.type === 'departure' ? '✈️ Departure' : '🛬 Arrival'}
        </div>
        {flight.status && (
          <div 
            className="flight-status"
            style={{ color: getFlightStatusColor(flight.status) }}
          >
            {flight.status}
          </div>
        )}
      </div>

      <div className="flight-card-main">
        <div className="flight-info-primary">
          <div className="flight-number">
            <span className="airline-code">{flight.airlineCode}</span>
            <span className="number">{flight.flightNumber.replace(flight.airlineCode, '')}</span>
          </div>
          <div className="airline-name">{flight.airlineName}</div>
        </div>

        <div className="flight-route">
          {flight.type === 'arrival' && flight.origin && (
            <>
              <div className="airport from">
                <span className="code">{flight.origin}</span>
                <span className="label">From</span>
              </div>
              <div className="route-arrow">→</div>
            </>
          )}
          <div className="flight-time-display">
            <span className="time">{formatFlightTime(flight.time)}</span>
            <span className="date">{formatDate(flight.date)}</span>
          </div>
          {flight.type === 'departure' && flight.destination && (
            <>
              <div className="route-arrow">→</div>
              <div className="airport to">
                <span className="code">{flight.destination}</span>
                <span className="label">To</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flight-card-details">
        {flight.terminal && (
          <div className="detail-item">
            <span className="detail-label">Terminal</span>
            <span className="detail-value">{flight.terminal}</span>
          </div>
        )}
        {flight.gate && (
          <div className="detail-item">
            <span className="detail-label">Gate</span>
            <span className="detail-value">{flight.gate}</span>
          </div>
        )}
        {flight.bookingReference && (
          <div className="detail-item">
            <span className="detail-label">Booking</span>
            <span className="detail-value">{flight.bookingReference}</span>
          </div>
        )}
        {flight.seatNumber && (
          <div className="detail-item">
            <span className="detail-label">Seat</span>
            <span className="detail-value">{flight.seatNumber}</span>
          </div>
        )}
      </div>

      {flight.notes && (
        <div className="flight-card-notes">
          <span className="notes-icon">📝</span>
          <span className="notes-text">{flight.notes}</span>
        </div>
      )}

      <div className="flight-card-actions">
        {onEdit && (
          <button 
            className="btn-icon" 
            onClick={() => onEdit(flight)}
            title="Edit flight"
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button 
            className="btn-icon delete" 
            onClick={() => onDelete(flight.id)}
            title="Delete flight"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
};
