import { useState, useEffect, useCallback, useRef } from 'react';
import type { Trip, TripDestination } from '../types/trip';
import { DestinationCard } from './DestinationCard';
import { AddDestinationForm } from './AddDestinationForm';
import { TripMap } from './TripMap';

type TabType = 'destinations' | 'map' | 'notes' | 'settings';

interface TripDetailViewProps {
  trip: Trip;
  onClose: () => void;
  onSave: (trip: Trip) => Promise<void>;
  onShare?: () => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateRange = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 'No dates set';
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return `${formatDate(startDate)} - ${formatDate(endDate)} • ${days} days`;
};

const getDayDate = (startDate: string, dayNumber: number) => {
  if (!startDate) return '';
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const getTripDays = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

export const TripDetailView = ({
  trip: initialTrip,
  onClose,
  onSave,
  onShare,
  isSaving = false,
  lastSaved,
}: TripDetailViewProps) => {
  const [trip, setTrip] = useState<Trip>(initialTrip);
  const [activeTab, setActiveTab] = useState<TabType>('destinations');
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(initialTrip.name);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pickingLocationFor, setPickingLocationFor] = useState<string | null>(null);
  
  const saveTimeoutRef = useRef<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-save after 2s of inactivity
  useEffect(() => {
    if (isDirty) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        onSave(trip);
        setIsDirty(false);
      }, 2000);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [trip, isDirty, onSave]);

  // Focus name input when editing
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditing]);

  const updateTrip = useCallback((updates: Partial<Trip>) => {
    setTrip((prev) => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
    setIsDirty(true);
  }, []);

  const handleNameSave = () => {
    if (editedName.trim()) {
      updateTrip({ name: editedName.trim() });
    } else {
      setEditedName(trip.name);
    }
    setIsEditing(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(trip.name);
      setIsEditing(false);
    }
  };

  const handleAddDestination = (destination: Omit<TripDestination, 'id' | 'order'>) => {
    const newDestination: TripDestination = {
      ...destination,
      id: crypto.randomUUID(),
      order: trip.destinations.filter((d) => d.day === destination.day).length,
    };
    updateTrip({
      destinations: [...trip.destinations, newDestination],
    });
    setShowAddForm(false);
  };

  const handleUpdateDestination = (id: string, updates: Partial<TripDestination>) => {
    updateTrip({
      destinations: trip.destinations.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    });
  };

  const handleDeleteDestination = (id: string) => {
    updateTrip({
      destinations: trip.destinations.filter((d) => d.id !== id),
    });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateTrip({ description: e.target.value });
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    updateTrip({ [field]: value });
  };

  const handlePickLocation = (destinationId: string) => {
    setPickingLocationFor(destinationId);
    setActiveTab('map');
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    if (pickingLocationFor) {
      handleUpdateDestination(pickingLocationFor, { lat, lng });
      setPickingLocationFor(null);
      // Optional: switch back to destinations tab or stay on map
      // setActiveTab('destinations'); 
    }
  };

  const handleViewOnMap = (destinationId: string) => {
    // Ideally we would also set selectedDestinationId here to highlight it on map
    // For now just switching tab is enough
    console.log('Viewing on map:', destinationId);
    setActiveTab('map');
  };

  // Group destinations by day
  const destinationsByDay = trip.destinations.reduce((acc, dest) => {
    const day = dest.day || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(dest);
    return acc;
  }, {} as Record<number, TripDestination[]>);

  // Sort destinations within each day by order
  Object.keys(destinationsByDay).forEach((day) => {
    destinationsByDay[Number(day)].sort((a, b) => a.order - b.order);
  });

  const totalDays = getTripDays(trip.startDate, trip.endDate);

  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} min ago`;
    return lastSaved.toLocaleTimeString();
  };

  return (
    <div className="trip-detail-overlay">
      <div className="trip-detail">
        {/* Header */}
        <header className="trip-detail-header">
          <div className="trip-detail-header-left">
            <button className="back-btn" onClick={onClose} title="Back to trips">
              ← Back
            </button>
          </div>
          
          <div className="trip-detail-header-center">
            {isEditing ? (
              <input
                ref={nameInputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                className="trip-name-input"
              />
            ) : (
              <h1 
                className="trip-detail-title" 
                onClick={() => setIsEditing(true)}
                title="Click to edit"
              >
                {trip.name}
                <span className="edit-icon">✏️</span>
              </h1>
            )}
            <p className="trip-detail-dates">{formatDateRange(trip.startDate, trip.endDate)}</p>
          </div>
          
          <div className="trip-detail-header-right">
            {onShare && (
              <button className="share-btn" onClick={onShare}>
                🔗 Share
              </button>
            )}
          </div>
        </header>

        {/* Tabs */}
        <nav className="trip-detail-tabs">
          <button
            className={`tab ${activeTab === 'destinations' ? 'active' : ''}`}
            onClick={() => setActiveTab('destinations')}
          >
            📍 Destinations
            {trip.destinations.length > 0 && (
              <span className="tab-badge">{trip.destinations.length}</span>
            )}
          </button>
          <button
            className={`tab ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            🗺️ Map
          </button>
          <button
            className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            📝 Notes
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        </nav>

        {/* Content */}
        <main className="trip-detail-content">
          {activeTab === 'destinations' && (
            <div className="destinations-tab">
              {trip.destinations.length === 0 && !showAddForm ? (
                <div className="empty-destinations">
                  <div className="empty-icon">📍</div>
                  <h3>No destinations yet</h3>
                  <p>Add your first destination to start planning!</p>
                  <button
                    className="create-trip-btn primary"
                    onClick={() => setShowAddForm(true)}
                  >
                    ➕ Add Destination
                  </button>
                </div>
              ) : (
                <>
                  {/* Day sections */}
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
                    <div key={day} className="day-section">
                      <h3 className="day-header">
                        Day {day} — {getDayDate(trip.startDate, day)}
                      </h3>
                      <div className="day-destinations">
                        {(destinationsByDay[day] || []).map((destination) => (
                          <DestinationCard
                            key={destination.id}
                            destination={destination}
                            onUpdate={(updates) =>
                              handleUpdateDestination(destination.id, updates)
                            }
                            onDelete={() => handleDeleteDestination(destination.id)}
                            onPickLocation={() => handlePickLocation(destination.id)}
                            onViewOnMap={() => handleViewOnMap(destination.id)}
                          />
                        ))}
                        {(!destinationsByDay[day] || destinationsByDay[day].length === 0) && (
                          <p className="no-destinations-day">No destinations for this day</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add destination form or button */}
                  {showAddForm ? (
                    <AddDestinationForm
                      totalDays={totalDays}
                      onAdd={handleAddDestination}
                      onCancel={() => setShowAddForm(false)}
                    />
                  ) : (
                    <button
                      className="add-destination-btn"
                      onClick={() => setShowAddForm(true)}
                    >
                      ➕ Add Destination
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'map' && (
            <div className="map-tab">
              {pickingLocationFor && (
                <div className="map-picking-banner">
                  <p>Click on the map to set location for selected destination</p>
                  <button 
                    className="btn-secondary small" 
                    onClick={() => setPickingLocationFor(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
              <TripMap
                destinations={trip.destinations}
                pickingMode={!!pickingLocationFor}
                onLocationSelect={handleLocationSelect}
                selectedDestinationId={pickingLocationFor}
              />
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="notes-tab">
              <textarea
                className="notes-textarea"
                placeholder="Add notes about your trip..."
                value={trip.description || ''}
                onChange={handleNotesChange}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-tab">
              <div className="settings-section">
                <h3>Trip Dates</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={trip.startDate}
                      onChange={(e) => handleDateChange('startDate', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={trip.endDate}
                      onChange={(e) => handleDateChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3>Trip Info</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Created</span>
                    <span className="info-value">{formatDate(trip.createdAt)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Updated</span>
                    <span className="info-value">{formatDate(trip.updatedAt)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Destinations</span>
                    <span className="info-value">{trip.destinations.length}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Duration</span>
                    <span className="info-value">{totalDays} days</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer with save status */}
        <footer className="trip-detail-footer">
          <div className="save-status">
            {isSaving ? (
              <>
                <span className="sync-dot syncing" />
                Saving...
              </>
            ) : isDirty ? (
              <>
                <span className="sync-dot syncing" />
                Unsaved changes
              </>
            ) : lastSaved ? (
              <>
                <span className="sync-dot" />
                Last saved {formatLastSaved()}
              </>
            ) : (
              <>
                <span className="sync-dot" />
                All changes saved
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
