import { useState } from 'react';
import type { TripDestination } from '../types/trip';

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
  const [day, setDay] = useState(1);
  const [notes, setNotes] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      address: address.trim() || undefined,
      day,
      notes: notes.trim() || undefined,
      arrivalTime: arrivalTime || undefined,
    });

    // Reset form
    setName('');
    setAddress('');
    setDay(1);
    setNotes('');
    setArrivalTime('');
  };

  return (
    <div className="add-destination-form card">
      <h3>Add Destination</h3>
      <form onSubmit={handleSubmit}>
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
        </div>

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
