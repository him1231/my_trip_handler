/**
 * Flight Service for Hong Kong Airport API
 * API Spec: https://www.hongkongairport.com/iwov-resources/misc/opendata/Flight_Information_DataSpec_en.pdf
 * 
 * Note: This API only provides historical data (previous calendar day).
 * For trip planning, we use it to look up past flight info when available.
 */

import type { HKAirportFlightInfo, FlightSearchParams, TripFlight } from '../types/flight';
import { getAirlineByIata } from '../data/airlines';

const HK_AIRPORT_API_URL = 'https://www.hongkongairport.com/flightinfo-rest/rest/flights';

/**
 * Fetch flight information from Hong Kong Airport API
 * Note: Only returns data for the previous calendar day
 */
export const fetchHKAirportFlights = async (params: FlightSearchParams): Promise<HKAirportFlightInfo | null> => {
  try {
    const url = new URL(HK_AIRPORT_API_URL);
    url.searchParams.append('date', params.date);
    url.searchParams.append('arrival', params.arrival.toString());
    url.searchParams.append('cargo', params.cargo.toString());
    url.searchParams.append('lang', params.lang);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('HK Airport API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data as HKAirportFlightInfo;
  } catch (error) {
    console.error('Failed to fetch HK Airport flights:', error);
    return null;
  }
};

/**
 * Search for a specific flight in HK Airport data
 */
export const searchFlightInHKData = async (
  flightNumber: string,
  date: string,
  isArrival: boolean
): Promise<TripFlight | null> => {
  const data = await fetchHKAirportFlights({
    date,
    arrival: isArrival,
    cargo: false,
    lang: 'en',
  });

  if (!data?.list) return null;

  // Find the flight
  for (const flight of data.list) {
    const matchingFlight = flight.flight?.find(
      f => f.no.toUpperCase() === flightNumber.toUpperCase()
    );

    if (matchingFlight) {
      const airline = getAirlineByIata(matchingFlight.airline);
      
      return {
        id: crypto.randomUUID(),
        type: isArrival ? 'arrival' : 'departure',
        flightNumber: matchingFlight.no,
        airlineCode: matchingFlight.airline,
        airlineName: airline?.name || matchingFlight.airline,
        date,
        time: flight.time,
        origin: flight.origin,
        destination: flight.destination,
        terminal: flight.terminal,
        gate: flight.gate,
        status: flight.status,
      };
    }
  }

  return null;
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
  if (lowerStatus.includes('on time') || lowerStatus.includes('arrived') || lowerStatus.includes('departed')) {
    return '#4CAF50'; // Green
  }
  if (lowerStatus.includes('delay')) {
    return '#FF9800'; // Orange
  }
  if (lowerStatus.includes('cancel')) {
    return '#F44336'; // Red
  }
  return '#2196F3'; // Blue for other statuses
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
