import { useState, useRef, useEffect } from 'react';
import type { TripFlight, Airline } from '../types/flight';
import { AIRLINES, searchAirlines, formatAirlineDisplay } from '../data/airlines';
import { createFlightEntry, searchFlightInAviationstack } from '../services/flightService';

interface AddFlightFormProps {
  tripStartDate: string;
  tripEndDate: string;
  onAdd: (flight: TripFlight) => void;
  onCancel: () => void;
}

export const AddFlightForm = ({ tripStartDate, tripEndDate, onAdd, onCancel }: AddFlightFormProps) => {
  const [type, setType] = useState<'arrival' | 'departure'>('departure');
  const [flightNumber, setFlightNumber] = useState('');
  const [selectedAirline, setSelectedAirline] = useState<Airline | null>(null);
  const [airlineSearch, setAirlineSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredAirlines, setFilteredAirlines] = useState<Airline[]>(AIRLINES);
  const [date, setDate] = useState(tripStartDate);
  const [time, setTime] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [terminal, setTerminal] = useState('');
  const [gate, setGate] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter airlines based on search
  useEffect(() => {
    const results = searchAirlines(airlineSearch);
    setFilteredAirlines(results);
  }, [airlineSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAirlineSelect = (airline: Airline) => {
    setSelectedAirline(airline);
    setAirlineSearch(formatAirlineDisplay(airline));
    setShowDropdown(false);
    setAutoFilled(false); // Reset auto-fill status when airline changes
    setFromCache(false);
  };

  // Fetch flight information from Aviationstack API (cache-aware)
  const handleFetchFlightInfo = async () => {
    if (!selectedAirline || !flightNumber || !date) {
      setFetchError('Please select airline, enter flight number, and date first');
      return;
    }

    setIsFetching(true);
    setFetchError(null);
    setFromCache(false);

    try {
      const fullFlightNumber = `${selectedAirline.iata}${flightNumber}`;
      const result = await searchFlightInAviationstack(
        fullFlightNumber,
        date,
        type === 'arrival'
      );

      if (result.flight) {
        // Auto-fill all fields
        setTime(result.flight.time || '');
        if (type === 'arrival') {
          setOrigin(result.flight.origin || '');
        } else {
          setDestination(result.flight.destination || '');
        }
        setTerminal(result.flight.terminal || '');
        setGate(result.flight.gate || '');
        setAutoFilled(true);
        setFromCache(result.fromCache);
        setFetchError(null);
      } else {
        setFetchError('Flight information not found. Please fill in details manually.');
        setFromCache(false);
      }
    } catch (error) {
      console.error('Failed to fetch flight info:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to fetch flight information. Please try again or fill in manually.';
      
      // Check if it's a plan restriction error
      if (errorMessage.includes('subscription plan') || errorMessage.includes('not available on your plan')) {
        setFetchError('Your Aviationstack plan doesn\'t support flight lookups. Please fill in details manually or upgrade your plan.');
      } else {
        setFetchError(errorMessage);
      }
      setFromCache(false);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAirline || !flightNumber || !date || !time) {
      alert('Please fill in all required fields');
      return;
    }

    const flight = createFlightEntry(
      type,
      `${selectedAirline.iata}${flightNumber}`,
      selectedAirline.iata,
      date,
      time,
      {
        origin: type === 'arrival' ? origin : undefined,
        destination: type === 'departure' ? destination : undefined,
        terminal: terminal || undefined,
        gate: gate || undefined,
        bookingReference: bookingRef || undefined,
        seatNumber: seatNumber || undefined,
        notes: notes || undefined,
      }
    );

    onAdd(flight);
  };

  return (
    <form className="add-flight-form" onSubmit={handleSubmit}>
      <h3>Add Flight</h3>

      {/* Flight Type */}
      <div className="form-row">
        <label>Flight Type</label>
        <div className="flight-type-toggle">
          <button
            type="button"
            className={`toggle-btn ${type === 'departure' ? 'active' : ''}`}
            onClick={() => {
              setType('departure');
              setAutoFilled(false);
              setFromCache(false);
            }}
          >
            ✈️ Departure
          </button>
          <button
            type="button"
            className={`toggle-btn ${type === 'arrival' ? 'active' : ''}`}
            onClick={() => {
              setType('arrival');
              setAutoFilled(false);
              setFromCache(false);
            }}
          >
            🛬 Arrival
          </button>
        </div>
      </div>

      {/* Airline Search Dropdown */}
      <div className="form-row">
        <label>Airline *</label>
        <div className="airline-dropdown" ref={dropdownRef}>
          <input
            ref={inputRef}
            type="text"
            value={airlineSearch}
            onChange={(e) => {
              setAirlineSearch(e.target.value);
              setSelectedAirline(null);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search by IATA code or airline name..."
            className="airline-search-input"
          />
          {showDropdown && (
            <div className="airline-dropdown-list">
              {filteredAirlines.length > 0 ? (
                filteredAirlines.slice(0, 10).map((airline) => (
                  <div
                    key={airline.iata}
                    className="airline-option"
                    onClick={() => handleAirlineSelect(airline)}
                  >
                    <span className="airline-iata">{airline.iata}</span>
                    <span className="airline-name">{airline.name}</span>
                    <span className="airline-country">{airline.country}</span>
                  </div>
                ))
              ) : (
                <div className="airline-no-results">No airlines found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Flight Number */}
      <div className="form-row">
        <label>Flight Number *</label>
        <div className="flight-number-input">
          <span className="airline-prefix">{selectedAirline?.iata || '--'}</span>
          <input
            type="text"
            value={flightNumber}
            onChange={(e) => {
              setFlightNumber(e.target.value.toUpperCase());
              setAutoFilled(false); // Reset when flight number changes
              setFromCache(false);
            }}
            placeholder="123"
            maxLength={6}
          />
        </div>
      </div>

      {/* Date and Time */}
      <div className="form-row two-col">
        <div>
          <label>Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setAutoFilled(false); // Reset when date changes
              setFromCache(false);
            }}
            min={tripStartDate}
            max={tripEndDate}
          />
        </div>
        <div>
          <label>Time *</label>
          <div className="time-input-with-fetch">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            {selectedAirline && flightNumber && date && (
              <button
                type="button"
                className="fetch-flight-btn"
                onClick={handleFetchFlightInfo}
                disabled={isFetching}
                title="Fetch flight information from Aviationstack API"
              >
                {isFetching ? '⏳' : '🔍'} {isFetching ? 'Fetching...' : 'Fetch Info'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Auto-fill status and error messages */}
      {autoFilled && (
        <div className="auto-fill-success">
          {fromCache ? (
            <>✓ Using cached flight data (no API call)</>
          ) : (
            <>✓ Flight information fetched from Aviationstack API</>
          )}
        </div>
      )}
      {fetchError && (
        <div className="fetch-error">
          ⚠️ {fetchError}
        </div>
      )}

      {/* Origin / Destination */}
      <div className="form-row">
        <label>{type === 'arrival' ? 'Origin' : 'Destination'} Airport</label>
        <input
          type="text"
          value={type === 'arrival' ? origin : destination}
          onChange={(e) => type === 'arrival' ? setOrigin(e.target.value.toUpperCase()) : setDestination(e.target.value.toUpperCase())}
          placeholder="Airport code (e.g., HKG, NRT)"
          maxLength={3}
        />
      </div>

      {/* Terminal and Gate */}
      <div className="form-row two-col">
        <div>
          <label>Terminal</label>
          <input
            type="text"
            value={terminal}
            onChange={(e) => setTerminal(e.target.value)}
            placeholder="T1"
          />
        </div>
        <div>
          <label>Gate</label>
          <input
            type="text"
            value={gate}
            onChange={(e) => setGate(e.target.value)}
            placeholder="A12"
          />
        </div>
      </div>

      {/* Booking Info */}
      <div className="form-row two-col">
        <div>
          <label>Booking Reference</label>
          <input
            type="text"
            value={bookingRef}
            onChange={(e) => setBookingRef(e.target.value.toUpperCase())}
            placeholder="ABC123"
          />
        </div>
        <div>
          <label>Seat Number</label>
          <input
            type="text"
            value={seatNumber}
            onChange={(e) => setSeatNumber(e.target.value.toUpperCase())}
            placeholder="12A"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="form-row">
        <label>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          Add Flight
        </button>
      </div>
    </form>
  );
};
