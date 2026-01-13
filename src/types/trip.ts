export interface TripDestination {
  id: string;
  name: string;
  placeId?: string; // Google Places ID
  address?: string;
  lat?: number;
  lng?: number;
  day: number;
  order: number;
  notes?: string;
  arrivalTime?: string;
  departureTime?: string;
}

export interface TripExpense {
  id: string;
  category: 'transport' | 'accommodation' | 'food' | 'activity' | 'shopping' | 'other';
  description: string;
  amount: number;
  currency: string;
  date: string;
  destinationId?: string;
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  startDate: string;
  endDate: string;
  destinations: TripDestination[];
  expenses: TripExpense[];
  totalBudget?: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  driveFileId?: string; // Google Drive file ID
}

export interface TripSummary {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  startDate: string;
  endDate: string;
  destinationCount: number;
  driveFileId: string;
  createdAt?: string;
  updatedAt?: string;
  lastModified?: string; // For shared trips
  owner?: string; // Owner name/email for shared trips
  sharedBy?: string; // Who shared it with you
  isShared?: boolean; // True if this is a shared trip
}

// Helper to create a new trip
export const createNewTrip = (name: string, startDate: string, endDate: string): Trip => ({
  id: crypto.randomUUID(),
  name,
  startDate,
  endDate,
  destinations: [],
  expenses: [],
  currency: 'USD',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Helper to create trip summary from full trip
export const tripToSummary = (trip: Trip, driveFileId: string): TripSummary => ({
  id: trip.id,
  name: trip.name,
  description: trip.description,
  coverImage: trip.coverImage,
  startDate: trip.startDate,
  endDate: trip.endDate,
  destinationCount: trip.destinations.length,
  driveFileId,
  createdAt: trip.createdAt,
  updatedAt: trip.updatedAt,
});
