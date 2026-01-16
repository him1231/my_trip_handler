import { useState, useEffect, useCallback, useRef } from 'react';
import type { Trip, TripDestination, TripExpense } from '../types/trip';
import type { TripFlight } from '../types/flight';
import { DestinationCard } from './DestinationCard';
import { AddDestinationForm } from './AddDestinationForm';
import { TripMap } from './TripMap';
import { FlightCard } from './FlightCard';
import { AddFlightForm } from './AddFlightForm';
import { ExpenseCard } from './ExpenseCard';
import { AddExpenseForm } from './AddExpenseForm';
import { BudgetSummary } from './BudgetSummary';
import { PackingList } from './PackingList';
import { WeatherWidget } from './WeatherWidget';
import { GoogleMapsListImport } from './GoogleMapsListImport';
import { sortFlights } from '../services/flightService';
import { exportTripToPdf } from '../services/exportService';
import { getSyncConfig, importPlacesFromUrl } from '../services/googleMapsListService';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';

type TabType = 'destinations' | 'flights' | 'budget' | 'map' | 'notes' | 'packing' | 'settings';

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
  const [showAddFlightForm, setShowAddFlightForm] = useState(false);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pickingLocationFor, setPickingLocationFor] = useState<string | null>(null);
  
  const saveTimeoutRef = useRef<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const syncIntervalRef = useRef<number | null>(null);
  const { isLoaded: mapsLoaded } = useGoogleMaps();

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

  const handleImportDestinations = useCallback((destinations: Omit<TripDestination, 'id' | 'order'>[]) => {
    const newDestinations: TripDestination[] = destinations.map((dest) => ({
      ...dest,
      id: crypto.randomUUID(),
      order: trip.destinations.filter((d) => d.day === dest.day).length,
    }));
    updateTrip({
      destinations: [...trip.destinations, ...newDestinations],
    });
  }, [trip.destinations, updateTrip]);

  // Auto-sync with Google Maps list (every 5 minutes)
  useEffect(() => {
    const syncConfig = getSyncConfig(trip.id);
    if (!syncConfig || !mapsLoaded) {
      return;
    }

    const performSync = async () => {
      try {
        const geocoder = new google.maps.Geocoder();

        const places = await importPlacesFromUrl(syncConfig.listUrl, geocoder);
        
        // Find new places
        const existingPlaceIds = new Set(
          trip.destinations
            .map(d => d.placeId)
            .filter((id): id is string => !!id)
        );

        const newPlaces = places.filter(
          p => p.placeId && !existingPlaceIds.has(p.placeId)
        );

        if (newPlaces.length > 0) {
          const destinations = newPlaces.map((place) => ({
            name: place.name,
            address: place.address,
            placeId: place.placeId,
            lat: place.lat,
            lng: place.lng,
            day: 1,
            notes: place.notes,
          }));
          handleImportDestinations(destinations);
        }
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    };

    // Initial sync after 30 seconds
    const initialTimeout = window.setTimeout(performSync, 30000);

    // Then sync every 5 minutes
    syncIntervalRef.current = window.setInterval(performSync, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [trip.id, trip.destinations, mapsLoaded, handleImportDestinations]);

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

  // Flight handlers
  const handleAddFlight = (flight: TripFlight) => {
    const flights = [...(trip.flights || []), flight];
    updateTrip({ flights: sortFlights(flights) });
    setShowAddFlightForm(false);
  };

  const handleDeleteFlight = (flightId: string) => {
    updateTrip({
      flights: (trip.flights || []).filter((f) => f.id !== flightId),
    });
  };

  // Expense handlers
  const handleAddExpense = (expense: TripExpense) => {
    const expenses = [...(trip.expenses || []), expense];
    // Sort by date
    expenses.sort((a, b) => a.date.localeCompare(b.date));
    updateTrip({ expenses });
    setShowAddExpenseForm(false);
  };

  const handleDeleteExpense = (expenseId: string) => {
    updateTrip({
      expenses: (trip.expenses || []).filter((e) => e.id !== expenseId),
    });
  };

  const handleBudgetChange = (budget: number) => {
    updateTrip({ totalBudget: budget });
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
            className={`tab ${activeTab === 'flights' ? 'active' : ''}`}
            onClick={() => setActiveTab('flights')}
          >
            ✈️ Flights
            {(trip.flights?.length || 0) > 0 && (
              <span className="tab-badge">{trip.flights?.length}</span>
            )}
          </button>
          <button
            className={`tab ${activeTab === 'budget' ? 'active' : ''}`}
            onClick={() => setActiveTab('budget')}
          >
            💰 Budget
            {(trip.expenses?.length || 0) > 0 && (
              <span className="tab-badge">{trip.expenses?.length}</span>
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
            className={`tab ${activeTab === 'packing' ? 'active' : ''}`}
            onClick={() => setActiveTab('packing')}
          >
            🧳 Packing
            {trip.packingList && trip.packingList.items.length > 0 && (
              <span className="tab-badge">{trip.packingList.items.filter(i => i.packed).length}/{trip.packingList.items.length}</span>
            )}
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
                    <div className="add-destination-actions">
                      <button
                        className="add-destination-btn"
                        onClick={() => setShowAddForm(true)}
                      >
                        ➕ Add Destination
                      </button>
                      <button
                        className="add-destination-btn secondary"
                        onClick={() => setShowImportModal(true)}
                      >
                        📋 Import from Google Maps
                      </button>
                    </div>
                  )}

                  {/* Weather Widget */}
                  {trip.destinations.length > 0 && (
                    <WeatherWidget
                      destinations={trip.destinations}
                      startDate={trip.startDate}
                      endDate={trip.endDate}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'flights' && (
            <div className="flights-tab">
              {(trip.flights?.length || 0) === 0 && !showAddFlightForm ? (
                <div className="empty-flights">
                  <div className="empty-icon">✈️</div>
                  <h3>No flights yet</h3>
                  <p>Add your flight details to keep track of your travel</p>
                  <button
                    className="create-trip-btn primary"
                    onClick={() => setShowAddFlightForm(true)}
                  >
                    ➕ Add Flight
                  </button>
                </div>
              ) : (
                <>
                  <div className="flights-header">
                    <h3>Your Flights</h3>
                    {!showAddFlightForm && (
                      <button
                        className="btn-primary small"
                        onClick={() => setShowAddFlightForm(true)}
                      >
                        ➕ Add Flight
                      </button>
                    )}
                  </div>

                  {showAddFlightForm && (
                    <AddFlightForm
                      tripStartDate={trip.startDate}
                      tripEndDate={trip.endDate}
                      onAdd={handleAddFlight}
                      onCancel={() => setShowAddFlightForm(false)}
                    />
                  )}

                  <div className="flights-list">
                    {sortFlights(trip.flights || []).map((flight) => (
                      <FlightCard
                        key={flight.id}
                        flight={flight}
                        onDelete={handleDeleteFlight}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'budget' && (
            <div className="budget-tab">
              {/* Budget Input */}
              <div className="budget-input-section">
                <label>Trip Budget ({trip.currency})</label>
                <input
                  type="number"
                  value={trip.totalBudget || ''}
                  onChange={(e) => handleBudgetChange(parseFloat(e.target.value) || 0)}
                  placeholder="Enter your budget..."
                  min="0"
                  step="100"
                />
              </div>

              {/* Budget Summary */}
              <BudgetSummary
                expenses={trip.expenses || []}
                totalBudget={trip.totalBudget}
                currency={trip.currency}
              />

              {/* Add Expense Button/Form */}
              {showAddExpenseForm ? (
                <AddExpenseForm
                  tripStartDate={trip.startDate}
                  tripEndDate={trip.endDate}
                  defaultCurrency={trip.currency}
                  onAdd={handleAddExpense}
                  onCancel={() => setShowAddExpenseForm(false)}
                />
              ) : (
                <button
                  className="add-expense-btn btn-primary"
                  onClick={() => setShowAddExpenseForm(true)}
                >
                  ➕ Add Expense
                </button>
              )}

              {/* Expense List */}
              {(trip.expenses?.length || 0) > 0 && (
                <div className="expenses-list">
                  <h4>Expenses</h4>
                  {[...(trip.expenses || [])].reverse().map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      onDelete={handleDeleteExpense}
                    />
                  ))}
                </div>
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

          {activeTab === 'packing' && (
            <div className="packing-tab">
              <PackingList
                packingList={trip.packingList}
                onUpdate={(packingList) => updateTrip({ packingList })}
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
                    <span className="info-label">Flights</span>
                    <span className="info-value">{trip.flights?.length || 0}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Expenses</span>
                    <span className="info-value">{trip.expenses?.length || 0}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Duration</span>
                    <span className="info-value">{totalDays} days</span>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3>Export</h3>
                <p className="settings-description">
                  Download your trip itinerary as a PDF to print or share offline.
                </p>
                <button 
                  className="btn-primary export-btn"
                  onClick={() => exportTripToPdf(trip)}
                >
                  📄 Export to PDF
                </button>
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

      {/* Google Maps List Import Modal */}
      <GoogleMapsListImport
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportDestinations}
        tripId={trip.id}
        existingDestinations={trip.destinations}
      />
    </div>
  );
};
