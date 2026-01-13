import { useState } from 'react';
import type { TripDestination } from '../types/trip';

interface DestinationCardProps {
  destination: TripDestination;
  onUpdate: (updates: Partial<TripDestination>) => void;
  onDelete: () => void;
  onPickLocation?: () => void;
  onViewOnMap?: () => void;
}

const formatDuration = (minutes?: number) => {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, mins] = startTime.split(':').map(Number);
  const totalMins = hours * 60 + mins + durationMinutes;
  const endHours = Math.floor(totalMins / 60) % 24;
  const endMins = totalMins % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
};

export const DestinationCard = ({
  destination,
  onUpdate,
  onDelete,
  onPickLocation,
  onViewOnMap,
}: DestinationCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(destination.name);
  const [editedAddress, setEditedAddress] = useState(destination.address || '');
  const [editedNotes, setEditedNotes] = useState(destination.notes || '');
  const [editedArrivalTime, setEditedArrivalTime] = useState(destination.arrivalTime || '');
  const [editedDuration, setEditedDuration] = useState(destination.duration?.toString() || '');

  const handleSave = () => {
    onUpdate({
      name: editedName.trim() || destination.name,
      address: editedAddress.trim() || undefined,
      notes: editedNotes.trim() || undefined,
      arrivalTime: editedArrivalTime || undefined,
      duration: editedDuration ? parseInt(editedDuration) : undefined,
      departureTime: editedArrivalTime && editedDuration 
        ? calculateEndTime(editedArrivalTime, parseInt(editedDuration))
        : undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(destination.name);
    setEditedAddress(destination.address || '');
    setEditedNotes(destination.notes || '');
    setEditedArrivalTime(destination.arrivalTime || '');
    setEditedDuration(destination.duration?.toString() || '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm(`Delete "${destination.name}"?`)) {
      onDelete();
    }
  };

  const hasLocation = destination.lat && destination.lng;
  const hasSchedule = destination.arrivalTime || destination.duration;

  return (
    <div className={`destination-card ${isExpanded ? 'expanded' : ''} ${hasSchedule ? 'has-schedule' : ''}`}>
      <div className="destination-card-main" onClick={() => !isEditing && setIsExpanded(!isExpanded)}>
        <div className="destination-order">{destination.order + 1}</div>
        
        <div className="destination-icon">
          {hasLocation ? '📍' : '⚪'}
        </div>
        
        <div className="destination-info">
          {isEditing ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="destination-name-input"
              placeholder="Destination name"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h4 className="destination-name">{destination.name}</h4>
          )}
          
          {isEditing ? (
            <input
              type="text"
              value={editedAddress}
              onChange={(e) => setEditedAddress(e.target.value)}
              className="destination-address-input"
              placeholder="Address (optional)"
              onClick={(e) => e.stopPropagation()}
            />
          ) : destination.address ? (
            <p className="destination-address">{destination.address}</p>
          ) : hasLocation ? (
            <p className="destination-coordinates">
              {destination.lat?.toFixed(4)}, {destination.lng?.toFixed(4)}
            </p>
          ) : null}
        </div>

        {/* Time Schedule Display */}
        {!isEditing && hasSchedule && (
          <div className="destination-schedule">
            {destination.arrivalTime && (
              <span className="schedule-time arrival">
                <span className="time-icon">🕐</span>
                <span className="time-value">{destination.arrivalTime}</span>
              </span>
            )}
            {destination.duration && (
              <span className="schedule-duration">
                <span className="duration-icon">⏱️</span>
                <span className="duration-value">{formatDuration(destination.duration)}</span>
              </span>
            )}
            {destination.departureTime && destination.arrivalTime !== destination.departureTime && (
              <span className="schedule-time departure">
                <span className="time-icon">→</span>
                <span className="time-value">{destination.departureTime}</span>
              </span>
            )}
          </div>
        )}

        <div className="destination-actions">
          {isEditing ? (
            <>
              <button
                className="action-btn save"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                title="Save"
              >
                ✓
              </button>
              <button
                className="action-btn cancel"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                title="Cancel"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              {!hasLocation && onPickLocation && (
                <button
                  className="action-btn map-location"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPickLocation();
                  }}
                  title="Set location on map"
                >
                  🗺️
                </button>
              )}
              {hasLocation && onViewOnMap && (
                <button
                  className="action-btn map-view"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewOnMap();
                  }}
                  title="View on map"
                >
                  👁️
                </button>
              )}
              <button
                className="action-btn edit"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  setIsExpanded(true);
                }}
                title="Edit"
              >
                ✏️
              </button>
              <button
                className="action-btn delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                title="Delete"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="destination-card-details">
          {isEditing ? (
            <div className="destination-edit-form">
              {/* Time Scheduling */}
              <div className="edit-section">
                <h5>⏰ Schedule</h5>
                <div className="time-inputs">
                  <div className="time-input-group">
                    <label>Arrival Time</label>
                    <input
                      type="time"
                      value={editedArrivalTime}
                      onChange={(e) => setEditedArrivalTime(e.target.value)}
                    />
                  </div>
                  <div className="time-input-group">
                    <label>Duration (minutes)</label>
                    <select
                      value={editedDuration}
                      onChange={(e) => setEditedDuration(e.target.value)}
                    >
                      <option value="">No duration</option>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">1 hour</option>
                      <option value="90">1.5 hours</option>
                      <option value="120">2 hours</option>
                      <option value="180">3 hours</option>
                      <option value="240">4 hours</option>
                      <option value="300">5 hours</option>
                      <option value="360">6 hours</option>
                      <option value="480">8 hours</option>
                    </select>
                  </div>
                </div>
                {editedArrivalTime && editedDuration && (
                  <p className="calculated-departure">
                    Departure: {calculateEndTime(editedArrivalTime, parseInt(editedDuration))}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="edit-section">
                <h5>📝 Notes</h5>
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  placeholder="Add notes about this destination..."
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="destination-details-content">
              {/* Schedule Info */}
              {hasSchedule && (
                <div className="schedule-info">
                  <div className="schedule-timeline">
                    {destination.arrivalTime && (
                      <div className="timeline-item">
                        <span className="timeline-label">Arrive</span>
                        <span className="timeline-value">{destination.arrivalTime}</span>
                      </div>
                    )}
                    {destination.duration && (
                      <div className="timeline-item">
                        <span className="timeline-label">Duration</span>
                        <span className="timeline-value">{formatDuration(destination.duration)}</span>
                      </div>
                    )}
                    {destination.departureTime && (
                      <div className="timeline-item">
                        <span className="timeline-label">Depart</span>
                        <span className="timeline-value">{destination.departureTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {destination.notes ? (
                <div className="destination-notes">
                  <span className="notes-label">Notes:</span>
                  <p>{destination.notes}</p>
                </div>
              ) : (
                <p className="no-notes">No notes added</p>
              )}
              
              <div className="destination-location-actions">
                {!hasLocation && onPickLocation && (
                  <button 
                    className="btn-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPickLocation();
                    }}
                  >
                    📍 Set location on map
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
