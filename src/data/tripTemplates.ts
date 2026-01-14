import type { Trip, TripDestination } from '../types/trip';

export interface TripTemplate {
  id: string;
  name: string;
  description: string;
  category: 'city' | 'beach' | 'adventure' | 'cultural' | 'weekend' | 'road-trip';
  duration: number; // days
  suggestedDestinations: Omit<TripDestination, 'id' | 'order'>[];
  suggestedBudget?: number;
  suggestedCurrency: string;
}

export const TRIP_TEMPLATES: TripTemplate[] = [
  {
    id: 'weekend-tokyo',
    name: 'Weekend in Tokyo',
    description: 'Perfect 2-day Tokyo city break with iconic sights',
    category: 'weekend',
    duration: 2,
    suggestedCurrency: 'JPY',
    suggestedBudget: 50000,
    suggestedDestinations: [
      {
        name: 'Shibuya Crossing',
        address: 'Shibuya City, Tokyo, Japan',
        day: 1,
        arrivalTime: '10:00',
        duration: 60,
        notes: 'World\'s busiest pedestrian crossing',
      },
      {
        name: 'Tokyo Skytree',
        address: '1 Chome-1-2 Oshiage, Sumida City, Tokyo',
        day: 1,
        arrivalTime: '14:00',
        duration: 120,
        notes: 'Tallest tower in Japan, great views',
      },
      {
        name: 'Senso-ji Temple',
        address: '2 Chome-3-1 Asakusa, Taito City, Tokyo',
        day: 2,
        arrivalTime: '09:00',
        duration: 90,
        notes: 'Tokyo\'s oldest temple',
      },
      {
        name: 'Tsukiji Outer Market',
        address: '4 Chome-16-2 Tsukiji, Chuo City, Tokyo',
        day: 2,
        arrivalTime: '11:00',
        duration: 60,
        notes: 'Fresh seafood and street food',
      },
    ],
  },
  {
    id: 'european-tour',
    name: '7-Day European Tour',
    description: 'Classic European cities: Paris, Amsterdam, Berlin',
    category: 'cultural',
    duration: 7,
    suggestedCurrency: 'EUR',
    suggestedBudget: 2000,
    suggestedDestinations: [
      {
        name: 'Eiffel Tower',
        address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France',
        day: 1,
        arrivalTime: '10:00',
        duration: 120,
        notes: 'Book tickets in advance',
      },
      {
        name: 'Louvre Museum',
        address: 'Rue de Rivoli, 75001 Paris, France',
        day: 2,
        arrivalTime: '09:00',
        duration: 180,
        notes: 'Home of the Mona Lisa',
      },
      {
        name: 'Anne Frank House',
        address: 'Westermarkt 20, 1016 GV Amsterdam, Netherlands',
        day: 4,
        arrivalTime: '10:00',
        duration: 90,
        notes: 'Book tickets months in advance',
      },
      {
        name: 'Brandenburg Gate',
        address: 'Pariser Platz, 10117 Berlin, Germany',
        day: 6,
        arrivalTime: '09:00',
        duration: 60,
        notes: 'Iconic symbol of Berlin',
      },
    ],
  },
  {
    id: 'beach-vacation',
    name: 'Beach Vacation',
    description: 'Relaxing beach getaway with water activities',
    category: 'beach',
    duration: 5,
    suggestedCurrency: 'USD',
    suggestedBudget: 1500,
    suggestedDestinations: [
      {
        name: 'Beach Day 1',
        address: 'Beach Resort',
        day: 1,
        arrivalTime: '09:00',
        duration: 480,
        notes: 'Sun, sand, and relaxation',
      },
      {
        name: 'Snorkeling Tour',
        address: 'Marina',
        day: 2,
        arrivalTime: '08:00',
        duration: 240,
        notes: 'Explore coral reefs',
      },
      {
        name: 'Beach Day 2',
        address: 'Beach Resort',
        day: 3,
        arrivalTime: '10:00',
        duration: 360,
        notes: 'Beach activities and water sports',
      },
      {
        name: 'Sunset Cruise',
        address: 'Harbor',
        day: 4,
        arrivalTime: '17:00',
        duration: 120,
        notes: 'Evening cruise with dinner',
      },
    ],
  },
  {
    id: 'city-break',
    name: 'City Break',
    description: 'Quick 3-day urban exploration',
    category: 'city',
    duration: 3,
    suggestedCurrency: 'USD',
    suggestedBudget: 800,
    suggestedDestinations: [
      {
        name: 'City Center',
        address: 'Downtown',
        day: 1,
        arrivalTime: '10:00',
        duration: 240,
        notes: 'Explore main attractions',
      },
      {
        name: 'Local Market',
        address: 'Market Square',
        day: 2,
        arrivalTime: '09:00',
        duration: 120,
        notes: 'Try local food and crafts',
      },
      {
        name: 'Museum District',
        address: 'Museum Quarter',
        day: 3,
        arrivalTime: '10:00',
        duration: 180,
        notes: 'Cultural sites and galleries',
      },
    ],
  },
  {
    id: 'road-trip',
    name: 'Road Trip Adventure',
    description: 'Epic road trip with multiple stops',
    category: 'road-trip',
    duration: 10,
    suggestedCurrency: 'USD',
    suggestedBudget: 2500,
    suggestedDestinations: [
      {
        name: 'Starting Point',
        address: 'Route Start',
        day: 1,
        arrivalTime: '08:00',
        duration: 60,
        notes: 'Begin your journey',
      },
      {
        name: 'Scenic Overlook',
        address: 'Mountain Pass',
        day: 3,
        arrivalTime: '14:00',
        duration: 60,
        notes: 'Photo stop with amazing views',
      },
      {
        name: 'National Park',
        address: 'Park Entrance',
        day: 5,
        arrivalTime: '09:00',
        duration: 480,
        notes: 'Hiking and nature exploration',
      },
      {
        name: 'Historic Town',
        address: 'Old Town Square',
        day: 7,
        arrivalTime: '10:00',
        duration: 240,
        notes: 'Explore historic sites',
      },
    ],
  },
];

/**
 * Create a trip from a template
 */
export const createTripFromTemplate = (template: TripTemplate, startDate: string): Trip => {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + template.duration - 1);
  
  const trip: Trip = {
    id: crypto.randomUUID(),
    name: template.name,
    description: template.description,
    startDate,
    endDate: endDate.toISOString().split('T')[0],
    destinations: template.suggestedDestinations.map((dest, index) => ({
      ...dest,
      id: crypto.randomUUID(),
      order: index,
    })),
    flights: [],
    expenses: [],
    totalBudget: template.suggestedBudget,
    currency: template.suggestedCurrency,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return trip;
};

/**
 * Get templates by category
 */
export const getTemplatesByCategory = (category?: TripTemplate['category']): TripTemplate[] => {
  if (!category) return TRIP_TEMPLATES;
  return TRIP_TEMPLATES.filter(t => t.category === category);
};

/**
 * Search templates by name
 */
export const searchTemplates = (query: string): TripTemplate[] => {
  const lowerQuery = query.toLowerCase();
  return TRIP_TEMPLATES.filter(
    t => t.name.toLowerCase().includes(lowerQuery) || 
         t.description.toLowerCase().includes(lowerQuery)
  );
};
