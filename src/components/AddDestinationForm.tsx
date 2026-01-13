import { useState } from 'react';
import type { TripDestination } from '../types/trip';
import { PlaceSearch } from './PlaceSearch';

interface AddDestinationFormProps {
  totalDays: number;
  onAdd: (destination: Omit<TripDestination, 'id' | 'order'>) => void;
  onCancel: () => void;
}

export const AddDestinationForm = ({
  totalDays,
  onAdd,
  onCancel,
}: AddDestinationFormProps) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [placeId, setPlaceId] = useState<string | undefined>();
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [day, setDay] = useState(1);
  const [notes, setNotes] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [duration, setDuration] = useState('');
  const [useSearch, setUseSearch] = useState(true);

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, mins] = startTime.split(':').map(Number);
    const totalMins = hours * 60 + mins + durationMinutes;
    const endHours = Math.floor(totalMins / 60) % 24;
    const endMins = totalMins % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const handlePlaceSelect = (place: {
    name: string;
    address: string;
    placeId: string;
    lat: number;
    lng: number;
  }) => {
    setName(place.name);
    setAddress(place.address);
    setPlaceId(place.placeId);
    setLat(place.lat);
    setLng(place.lng);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    const durationMins = duration ? parseInt(duration) : undefined;
    
    onAdd({
      name: name.trim(),
      address: address.trim() || undefined,
      placeId,
      lat,
      lng,
      day,
      notes: notes.trim() || undefined,
      arrivalTime: arrivalTime || undefined,
      duration: durationMins,
      departureTime: arrivalTime && durationMins 
        ? calculateEndTime(arrivalTime, durationMins)
        : undefined,
    });

    // Reset form
    setName('');
    setAddress('');
    setPlaceId(undefined);
    setLat(undefined);
    setLng(undefined);
    setDay(1);
    setNotes('');
    setArrivalTime('');
    setDuration('');
  };

  return (
    <div className="add-destination-form card">
      <h3>Add Destination</h3>
      <form onSubmit={handleSubmit}>
        {/* Search Mode Toggle */}
        <div className="search-mode-toggle">
          <button
            type="button"
            className={`toggle-btn ${useSearch ? 'active' : ''}`}
            onClick={() => setUseSearch(true)}
          >
            🔍 Search Places
          </button>
          <button
            type="button"
            className={`toggle-btn ${!useSearch ? 'active' : ''}`}
            onClick={() => setUseSearch(false)}
          >
            ✏️ Manual Entry
          </button>
        </div>

        {useSearch ? (
          <div className="form-group">
            <label>Search for a place</label>
            <PlaceSearch
              onPlaceSelect={handlePlaceSelect}
              placeholder="Search restaurants, attractions, hotels..."
            />
            {name && (
              <div className="selected-place">
                <strong>📍 {name}</strong>
                {address && <p>{address}</p>}
                {lat && lng && (
                  <span className="coordinates">
                    {lat.toFixed(4)}, {lng.toFixed(4)}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="dest-name">Name *</label>
              <input
                id="dest-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Tokyo Tower, Central Park"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="dest-address">Address</label>
              <input
                id="dest-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., 4 Chome-2-8 Shibakoen, Tokyo"
              />
            </div>
          </>
        )}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="dest-day">Day</label>
            <select
              id="dest-day"
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            >
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="dest-time">Arrival Time</label>
            <input
              id="dest-time"
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="dest-duration">Duration</label>
            <select
              id="dest-duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
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
        
        {arrivalTime && duration && (
          <p className="calculated-departure-info">
            📅 Departure time: {calculateEndTime(arrivalTime, parseInt(duration))}
          </p>
        )}

        <div className="form-group">
          <label htmlFor="dest-notes">Notes</label>
          <textarea
            id="dest-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this destination..."
            rows={2}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>
            Add Destination
          </button>
        </div>
      </form>
    </div>
  );
};
