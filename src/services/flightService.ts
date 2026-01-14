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
 * Cache storage types
 */
interface CachedFlight {
  data: TripFlight;
  cachedAt: number; // timestamp
  expiresAt: number; // timestamp
}

const CACHE_PREFIX = 'flight_cache_';
const MAX_CACHE_SIZE = 50;

/**
 * Generate cache key for a flight
 */
const getCacheKey = (flightNumber: string, date: string, type: string): string => {
  // Normalize flight number (remove spaces, uppercase)
  const normalized = flightNumber.toUpperCase().replace(/\s+/g, '');
  return `${CACHE_PREFIX}${normalized}_${date}_${type}`;
};

/**
 * Get cache expiration time based on flight date
 */
const getCacheExpiration = (date: string): number => {
  const now = Date.now();
  const flightDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  flightDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((flightDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Past flight - cache for 24 hours
    return now + (24 * 60 * 60 * 1000);
  } else if (diffDays === 0) {
    // Today's flight - cache for 15 minutes (real-time status changes)
    return now + (15 * 60 * 1000);
  } else {
    // Future flight - cache for 1 hour (schedules can change)
    return now + (60 * 60 * 1000);
  }
};

/**
 * Get cached flight data if valid
 */
export const getCachedFlight = (
  flightNumber: string,
  date: string,
  type: string
): TripFlight | null => {
  try {
    const key = getCacheKey(flightNumber, date, type);
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;

    const cachedFlight: CachedFlight = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now > cachedFlight.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }

    return cachedFlight.data;
  } catch (error) {
    console.error('Error reading flight cache:', error);
    return null;
  }
};

/**
 * Store flight data in cache
 */
export const setCachedFlight = (
  flightNumber: string,
  date: string,
  type: string,
  flight: TripFlight
): void => {
  const key = getCacheKey(flightNumber, date, type);
  const now = Date.now();
  const expiresAt = getCacheExpiration(date);

  const cachedFlight: CachedFlight = {
    data: flight,
    cachedAt: now,
    expiresAt,
  };

  try {
    localStorage.setItem(key, JSON.stringify(cachedFlight));

    // Cleanup old cache entries if we exceed max size
    cleanupExpiredCache();
    limitCacheSize();
  } catch (error) {
    console.error('Error storing flight cache:', error);
    // If storage is full, try to clean up and retry
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      cleanupExpiredCache();
      limitCacheSize();
      try {
        localStorage.setItem(key, JSON.stringify(cachedFlight));
      } catch (retryError) {
        console.error('Failed to store cache after cleanup:', retryError);
      }
    }
  }
};

/**
 * Clean up expired cache entries
 */
export const cleanupExpiredCache = (): void => {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cachedFlight: CachedFlight = JSON.parse(cached);
            if (now > cachedFlight.expiresAt) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Invalid cache entry, remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error cleaning up cache:', error);
  }
};

/**
 * Limit cache size by removing oldest entries
 */
const limitCacheSize = (): void => {
  try {
    const cacheEntries: Array<{ key: string; cachedAt: number }> = [];

    // Collect all cache entries with their timestamps
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cachedFlight: CachedFlight = JSON.parse(cached);
            cacheEntries.push({ key, cachedAt: cachedFlight.cachedAt });
          }
        } catch {
          // Invalid entry, will be removed
        }
      }
    }

    // If we exceed max size, remove oldest entries
    if (cacheEntries.length > MAX_CACHE_SIZE) {
      cacheEntries.sort((a, b) => a.cachedAt - b.cachedAt);
      const toRemove = cacheEntries.slice(0, cacheEntries.length - MAX_CACHE_SIZE);
      toRemove.forEach(entry => localStorage.removeItem(entry.key));
    }
  } catch (error) {
    console.error('Error limiting cache size:', error);
  }
};

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
 * Search result with cache status
 */
export interface FlightSearchResult {
  flight: TripFlight | null;
  fromCache: boolean;
}

/**
 * Search for a specific flight using Aviationstack API
 * Works for past, present, and future flights
 * Checks cache first to avoid unnecessary API calls
 */
export const searchFlightInAviationstack = async (
  flightNumber: string, // e.g., "CX123" or "123" (will try both)
  date: string, // YYYY-MM-DD
  isArrival: boolean
): Promise<FlightSearchResult> => {
  const type = isArrival ? 'arrival' : 'departure';
  
  // Check cache first
  const cached = getCachedFlight(flightNumber, date, type);
  if (cached) {
    return { flight: cached, fromCache: true };
  }

  // No valid cache, fetch from API
  if (!AVIATIONSTACK_API_KEY) {
    console.warn('Aviationstack API key not configured');
    return { flight: null, fromCache: false };
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
      return { flight: null, fromCache: false };
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('Aviationstack API error:', response.status, response.statusText);
      return { flight: null, fromCache: false };
    }

    const data: AviationstackFlightResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      return { flight: null, fromCache: false };
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
    
    const flightData: TripFlight = {
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

    // Cache the result
    setCachedFlight(flightNumber, date, type, flightData);

    return { flight: flightData, fromCache: false };
  } catch (error) {
    console.error('Failed to fetch flight from Aviationstack:', error);
    return { flight: null, fromCache: false };
  }
};

/**
 * Search for a specific flight (backward compatible function name)
 * Now uses Aviationstack instead of HK Airport API
 * Returns just the flight data (for backward compatibility)
 */
export const searchFlightInHKData = async (
  flightNumber: string,
  date: string,
  isArrival: boolean
): Promise<TripFlight | null> => {
  const result = await searchFlightInAviationstack(flightNumber, date, isArrival);
  return result.flight;
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
