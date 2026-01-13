import { useState } from 'react';
import { createNewTrip, type Trip } from '../types/trip';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trip: Trip) => Promise<void>;
  saving: boolean;
}

export const CreateTripModal = ({ isOpen, onClose, onSave, saving }: CreateTripModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Please enter a trip name');
      return;
    }
    if (!startDate) {
      setError('Please select a start date');
      return;
    }
    if (!endDate) {
      setError('Please select an end date');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be after start date');
      return;
    }

    const trip = createNewTrip(name.trim(), startDate, endDate);
    if (description.trim()) {
      trip.description = description.trim();
    }

    try {
      await onSave(trip);
      // Reset form
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save trip');
    }
  };

  const handleClose = () => {
    if (!saving) {
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Trip</h2>
          <button 
            className="modal-close" 
            onClick={handleClose}
            disabled={saving}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="trip-name">Trip Name *</label>
            <input
              id="trip-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Summer Vacation 2024"
              disabled={saving}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="trip-description">Description</label>
            <textarea
              id="trip-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this trip about?"
              rows={3}
              disabled={saving}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start-date">Start Date *</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="end-date">End Date *</label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
                disabled={saving}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="loading-spinner small" />
                  Saving...
                </>
              ) : (
                'Create Trip'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
