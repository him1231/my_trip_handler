/**
 * Flight Service for Aviationstack API
 * API: https://aviationstack.com/
 * 
 * Supports real-time flight status, historical flights, and future scheduled flights
 */

import type { TripFlight } from '../types/flight';
import { getAirlineByIata } from '../data/airlines';

const AVIATIONSTACK_API_URL = 'https://api.aviationstack.com/v1';
const AVIATIONSTACK_API_KEY = import.meta.env.VITE_AVIATIONSTACK_API_KEY || '';

/**
 * Aviationstack API Response types
 */
interface AviationstackFlightResponse {
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
  data: AviationstackFlight[];
}

interface AviationstackFlight {
  flight_date: string;
  flight_status: string;
  departure: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal?: string;
    gate?: string;
    delay?: number;
    scheduled: string;
    estimated: string;
    actual?: string;
    estimated_runway?: string;
    actual_runway?: string;
  };
  arrival: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal?: string;
    gate?: string;
    baggage?: string;
    delay?: number;
    scheduled: string;
    estimated: string;
    actual?: string;
    estimated_runway?: string;
    actual_runway?: string;
  };
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  flight: {
    number: string;
    iata: string;
    icao: string;
  };
  aircraft?: {
    registration?: string;
    iata?: string;
    icao?: string;
    icao24?: string;
  };
}

/**
 * Search for a specific flight using Aviationstack API
 * Works for past, present, and future flights
 */
export const searchFlightInAviationstack = async (
  flightNumber: string, // e.g., "CX123" or "123" (will try both)
  date: string, // YYYY-MM-DD
  isArrival: boolean
): Promise<TripFlight | null> => {
  if (!AVIATIONSTACK_API_KEY) {
    console.warn('Aviationstack API key not configured');
    return null;
  }

  try {
    // Extract airline code and flight number
    // Flight number might be "CX123" or just "123"
    const flightNumberUpper = flightNumber.toUpperCase();
    let airlineCode = '';
    let flightNum = '';
    
    // Try to extract airline code (2-3 letters) from the beginning
    const airlineMatch = flightNumberUpper.match(/^([A-Z]{2,3})(\d+)$/);
    if (airlineMatch) {
      airlineCode = airlineMatch[1];
      flightNum = airlineMatch[2];
    } else {
      // If no airline code, try to use just the number
      flightNum = flightNumberUpper.replace(/[^0-9]/g, '');
    }

    const url = new URL(`${AVIATIONSTACK_API_URL}/flights`);
    url.searchParams.append('access_key', AVIATIONSTACK_API_KEY);
    url.searchParams.append('flight_date', date);
    
    // Try with full flight number first (e.g., "CX123")
    if (airlineCode && flightNum) {
      url.searchParams.append('flight_iata', `${airlineCode}${flightNum}`);
    } else if (flightNum) {
      url.searchParams.append('flight_number', flightNum);
    } else {
      return null;
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('Aviationstack API error:', response.status, response.statusText);
      return null;
    }

    const data: AviationstackFlightResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      return null;
    }

    // Find the best matching flight
    // If we have multiple results, prefer the one matching our airline code
    let flight = data.data[0];
    
    if (airlineCode && data.data.length > 1) {
      const matching = data.data.find(
        f => f.airline.iata.toUpperCase() === airlineCode.toUpperCase()
      );
      if (matching) {
        flight = matching;
      }
    }

    // Extract time from departure or arrival based on type
    const timeData = isArrival ? flight.arrival : flight.departure;
    const scheduledTime = timeData.scheduled || timeData.estimated;
    const time = scheduledTime ? new Date(scheduledTime).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }) : '';

    // Get status
    let status = flight.flight_status || '';
    if (timeData.delay && timeData.delay > 0) {
      status = `Delayed ${timeData.delay} min`;
    }

    // Build the flight entry
    const airline = getAirlineByIata(flight.airline.iata);
    
    return {
      id: crypto.randomUUID(),
      type: isArrival ? 'arrival' : 'departure',
      flightNumber: flight.flight.iata || flight.flight.number,
      airlineCode: flight.airline.iata,
      airlineName: airline?.name || flight.airline.name,
      date,
      time,
      origin: isArrival ? flight.departure.iata : undefined,
      destination: isArrival ? undefined : flight.arrival.iata,
      terminal: timeData.terminal || undefined,
      gate: timeData.gate || undefined,
      status: status || undefined,
    };
  } catch (error) {
    console.error('Failed to fetch flight from Aviationstack:', error);
    return null;
  }
};

/**
 * Search for a specific flight (backward compatible function name)
 * Now uses Aviationstack instead of HK Airport API
 */
export const searchFlightInHKData = async (
  flightNumber: string,
  date: string,
  isArrival: boolean
): Promise<TripFlight | null> => {
  return searchFlightInAviationstack(flightNumber, date, isArrival);
};

/**
 * Create a new flight entry manually
 */
export const createFlightEntry = (
  type: 'arrival' | 'departure',
  flightNumber: string,
  airlineCode: string,
  date: string,
  time: string,
  options?: {
    origin?: string;
    destination?: string;
    terminal?: string;
    gate?: string;
    bookingReference?: string;
    seatNumber?: string;
    notes?: string;
  }
): TripFlight => {
  const airline = getAirlineByIata(airlineCode);
  
  return {
    id: crypto.randomUUID(),
    type,
    flightNumber,
    airlineCode,
    airlineName: airline?.name || airlineCode,
    date,
    time,
    ...options,
  };
};

/**
 * Format flight time display
 */
export const formatFlightTime = (time: string): string => {
  // Handle various time formats
  if (time.includes(':')) return time;
  if (time.length === 4) {
    return `${time.slice(0, 2)}:${time.slice(2)}`;
  }
  return time;
};

/**
 * Get flight status color
 */
export const getFlightStatusColor = (status?: string): string => {
  if (!status) return '#888';
  
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('scheduled') || lowerStatus.includes('on time') || 
      lowerStatus.includes('landed') || lowerStatus.includes('arrived') || 
      lowerStatus.includes('departed')) {
    return '#4CAF50'; // Green
  }
  if (lowerStatus.includes('delay')) {
    return '#FF9800'; // Orange
  }
  if (lowerStatus.includes('cancel')) {
    return '#F44336'; // Red
  }
  if (lowerStatus.includes('active') || lowerStatus.includes('in flight')) {
    return '#2196F3'; // Blue
  }
  return '#888'; // Gray for unknown
};

/**
 * Sort flights by date and time
 */
export const sortFlights = (flights: TripFlight[]): TripFlight[] => {
  return [...flights].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });
};
