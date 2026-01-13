/**
 * Flight types for Hong Kong Airport API integration
 * API Spec: https://www.hongkongairport.com/iwov-resources/misc/opendata/Flight_Information_DataSpec_en.pdf
 */

export interface Airline {
  iata: string;      // IATA airline code (e.g., "CX")
  name: string;      // Full airline name (e.g., "Cathay Pacific")
  country?: string;  // Country of origin
}

export interface FlightNumber {
  no: string;        // Flight number
  airline: string;   // Airline IATA code
}

// HK Airport API Response types
export interface HKAirportFlightInfo {
  date: string;
  arrival: boolean;
  cargo: boolean;
  list: HKAirportFlight[];
}

export interface HKAirportFlight {
  time: string;
  status: string;
  statusCode: string;
  terminal: string;
  flight: FlightNumber[];
  // Arrival specific
  origin?: string;
  baggage?: string;
  hall?: string;
  stand?: string;
  // Departure specific
  destination?: string;
  aisle?: string;
  gate?: string;
}

// Trip flight record (stored in user's trip)
export interface TripFlight {
  id: string;
  type: 'arrival' | 'departure';
  flightNumber: string;
  airlineCode: string;
  airlineName: string;
  date: string;           // YYYY-MM-DD
  time: string;           // HH:mm
  origin?: string;        // Airport code for arrival
  destination?: string;   // Airport code for departure
  terminal?: string;
  gate?: string;
  status?: string;
  notes?: string;
  // Booking info
  bookingReference?: string;
  seatNumber?: string;
}

// Search/filter types
export interface FlightSearchParams {
  date: string;
  arrival: boolean;
  cargo: boolean;
  lang: 'en' | 'zh_HK' | 'zh_CN';
}
