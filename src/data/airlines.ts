/**
 * Airline data with IATA codes
 * This list includes major international airlines
 */

import type { Airline } from '../types/flight';

export const AIRLINES: Airline[] = [
  // Asia-Pacific
  { iata: 'CX', name: 'Cathay Pacific', country: 'Hong Kong' },
  { iata: 'HX', name: 'Hong Kong Airlines', country: 'Hong Kong' },
  { iata: 'UO', name: 'HK Express', country: 'Hong Kong' },
  { iata: 'SQ', name: 'Singapore Airlines', country: 'Singapore' },
  { iata: 'TR', name: 'Scoot', country: 'Singapore' },
  { iata: 'TG', name: 'Thai Airways', country: 'Thailand' },
  { iata: 'VN', name: 'Vietnam Airlines', country: 'Vietnam' },
  { iata: 'VJ', name: 'VietJet Air', country: 'Vietnam' },
  { iata: 'MH', name: 'Malaysia Airlines', country: 'Malaysia' },
  { iata: 'AK', name: 'AirAsia', country: 'Malaysia' },
  { iata: 'D7', name: 'AirAsia X', country: 'Malaysia' },
  { iata: 'GA', name: 'Garuda Indonesia', country: 'Indonesia' },
  { iata: 'QZ', name: 'Indonesia AirAsia', country: 'Indonesia' },
  { iata: 'PR', name: 'Philippine Airlines', country: 'Philippines' },
  { iata: '5J', name: 'Cebu Pacific', country: 'Philippines' },
  { iata: 'BR', name: 'EVA Air', country: 'Taiwan' },
  { iata: 'CI', name: 'China Airlines', country: 'Taiwan' },
  { iata: 'IT', name: 'Tigerair Taiwan', country: 'Taiwan' },
  { iata: 'JL', name: 'Japan Airlines', country: 'Japan' },
  { iata: 'NH', name: 'All Nippon Airways', country: 'Japan' },
  { iata: 'MM', name: 'Peach Aviation', country: 'Japan' },
  { iata: 'GK', name: 'Jetstar Japan', country: 'Japan' },
  { iata: 'KE', name: 'Korean Air', country: 'South Korea' },
  { iata: 'OZ', name: 'Asiana Airlines', country: 'South Korea' },
  { iata: 'TW', name: 'T\'way Air', country: 'South Korea' },
  { iata: '7C', name: 'Jeju Air', country: 'South Korea' },
  { iata: 'LJ', name: 'Jin Air', country: 'South Korea' },
  { iata: 'QF', name: 'Qantas', country: 'Australia' },
  { iata: 'JQ', name: 'Jetstar Airways', country: 'Australia' },
  { iata: 'VA', name: 'Virgin Australia', country: 'Australia' },
  { iata: 'NZ', name: 'Air New Zealand', country: 'New Zealand' },
  { iata: 'AI', name: 'Air India', country: 'India' },
  { iata: '6E', name: 'IndiGo', country: 'India' },
  { iata: 'UK', name: 'Vistara', country: 'India' },
  
  // China
  { iata: 'CA', name: 'Air China', country: 'China' },
  { iata: 'MU', name: 'China Eastern Airlines', country: 'China' },
  { iata: 'CZ', name: 'China Southern Airlines', country: 'China' },
  { iata: 'HU', name: 'Hainan Airlines', country: 'China' },
  { iata: '3U', name: 'Sichuan Airlines', country: 'China' },
  { iata: 'ZH', name: 'Shenzhen Airlines', country: 'China' },
  { iata: 'MF', name: 'Xiamen Airlines', country: 'China' },
  { iata: 'FM', name: 'Shanghai Airlines', country: 'China' },
  { iata: '9C', name: 'Spring Airlines', country: 'China' },
  
  // Middle East
  { iata: 'EK', name: 'Emirates', country: 'UAE' },
  { iata: 'EY', name: 'Etihad Airways', country: 'UAE' },
  { iata: 'QR', name: 'Qatar Airways', country: 'Qatar' },
  { iata: 'GF', name: 'Gulf Air', country: 'Bahrain' },
  { iata: 'WY', name: 'Oman Air', country: 'Oman' },
  { iata: 'SV', name: 'Saudi Arabian Airlines', country: 'Saudi Arabia' },
  { iata: 'LY', name: 'El Al', country: 'Israel' },
  { iata: 'TK', name: 'Turkish Airlines', country: 'Turkey' },
  
  // Europe
  { iata: 'BA', name: 'British Airways', country: 'United Kingdom' },
  { iata: 'VS', name: 'Virgin Atlantic', country: 'United Kingdom' },
  { iata: 'U2', name: 'easyJet', country: 'United Kingdom' },
  { iata: 'AF', name: 'Air France', country: 'France' },
  { iata: 'LH', name: 'Lufthansa', country: 'Germany' },
  { iata: 'LX', name: 'Swiss International', country: 'Switzerland' },
  { iata: 'OS', name: 'Austrian Airlines', country: 'Austria' },
  { iata: 'KL', name: 'KLM Royal Dutch', country: 'Netherlands' },
  { iata: 'AY', name: 'Finnair', country: 'Finland' },
  { iata: 'SK', name: 'SAS Scandinavian', country: 'Scandinavia' },
  { iata: 'IB', name: 'Iberia', country: 'Spain' },
  { iata: 'AZ', name: 'ITA Airways', country: 'Italy' },
  { iata: 'TP', name: 'TAP Air Portugal', country: 'Portugal' },
  { iata: 'FR', name: 'Ryanair', country: 'Ireland' },
  { iata: 'W6', name: 'Wizz Air', country: 'Hungary' },
  { iata: 'SU', name: 'Aeroflot', country: 'Russia' },
  
  // North America
  { iata: 'AA', name: 'American Airlines', country: 'United States' },
  { iata: 'DL', name: 'Delta Air Lines', country: 'United States' },
  { iata: 'UA', name: 'United Airlines', country: 'United States' },
  { iata: 'WN', name: 'Southwest Airlines', country: 'United States' },
  { iata: 'B6', name: 'JetBlue Airways', country: 'United States' },
  { iata: 'AS', name: 'Alaska Airlines', country: 'United States' },
  { iata: 'HA', name: 'Hawaiian Airlines', country: 'United States' },
  { iata: 'F9', name: 'Frontier Airlines', country: 'United States' },
  { iata: 'NK', name: 'Spirit Airlines', country: 'United States' },
  { iata: 'AC', name: 'Air Canada', country: 'Canada' },
  { iata: 'WS', name: 'WestJet', country: 'Canada' },
  { iata: 'AM', name: 'Aeromexico', country: 'Mexico' },
  
  // South America
  { iata: 'LA', name: 'LATAM Airlines', country: 'Chile' },
  { iata: 'G3', name: 'Gol Airlines', country: 'Brazil' },
  { iata: 'AD', name: 'Azul Brazilian Airlines', country: 'Brazil' },
  { iata: 'AV', name: 'Avianca', country: 'Colombia' },
  { iata: 'CM', name: 'Copa Airlines', country: 'Panama' },
  
  // Africa
  { iata: 'ET', name: 'Ethiopian Airlines', country: 'Ethiopia' },
  { iata: 'SA', name: 'South African Airways', country: 'South Africa' },
  { iata: 'MS', name: 'EgyptAir', country: 'Egypt' },
  { iata: 'AT', name: 'Royal Air Maroc', country: 'Morocco' },
  { iata: 'KQ', name: 'Kenya Airways', country: 'Kenya' },
];

/**
 * Search airlines by IATA code or name
 */
export const searchAirlines = (query: string): Airline[] => {
  if (!query.trim()) return AIRLINES;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return AIRLINES.filter(airline => 
    airline.iata.toLowerCase().includes(lowerQuery) ||
    airline.name.toLowerCase().includes(lowerQuery) ||
    airline.country?.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Get airline by IATA code
 */
export const getAirlineByIata = (iata: string): Airline | undefined => {
  return AIRLINES.find(airline => airline.iata.toUpperCase() === iata.toUpperCase());
};

/**
 * Format airline display string
 */
export const formatAirlineDisplay = (airline: Airline): string => {
  return `${airline.iata} - ${airline.name}`;
};
