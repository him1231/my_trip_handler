import { useState } from 'react';
import type { TripDestination } from '../types/trip';

interface DestinationCardProps {
  destination: TripDestination;
  onUpdate: (updates: Partial<TripDestination>) => void;
  onDelete: () => void;
  onPickLocation?: () => void;
  onViewOnMap?: () => void;
}

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

  const handleSave = () => {
    onUpdate({
      name: editedName.trim() || destination.name,
      address: editedAddress.trim() || undefined,
      notes: editedNotes.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(destination.name);
    setEditedAddress(destination.address || '');
    setEditedNotes(destination.notes || '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm(`Delete "${destination.name}"?`)) {
      onDelete();
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    return time;
  };

  const hasLocation = destination.lat && destination.lng;

  return (
    <div className={`destination-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="destination-card-main" onClick={() => !isEditing && setIsExpanded(!isExpanded)}>
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

        <div className="destination-times">
          {destination.arrivalTime && (
            <span className="destination-time">
              🕐 {formatTime(destination.arrivalTime)}
            </span>
          )}
        </div>

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
            <div className="destination-notes-edit">
              <label>Notes</label>
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Add notes about this destination..."
                rows={3}
              />
            </div>
          ) : (
            <div className="destination-details-content">
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
