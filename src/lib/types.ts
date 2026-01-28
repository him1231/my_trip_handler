export type TripRole = "owner" | "editor" | "viewer";

export type TripMember = {
  role: TripRole;
  displayName: string | null;
  photoURL: string | null;
};

export type Trip = {
  id: string;
  title: string;
  description?: string;
  destination?: string;
  destinationPlaceId?: string;
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
  template?: string;
  ownerId: string;
  inviteToken: string;
  memberIds: string[];
  members: Record<string, TripMember>;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TripLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  note?: string;
  createdBy: string;
  createdAt?: Date;
};

export type ItineraryDay = {
  id: string;
  tripId: string;
  date: Date;
  dayNumber: number;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UnscheduledGroup = {
  id: string;
  tripId: string;
  title: string;
  order: number;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ItineraryItemType =
  | "flight"
  | "hotel"
  | "activity"
  | "restaurant"
  | "note"
  | "transport"
  | "checklist";

export type ChecklistItem = {
  id: string;
  title: string;
  done: boolean;
};

export type ItineraryItemDetails = {
  flightNumber?: string;
  airline?: string;
  departure?: { airport: string; time: Date };
  arrival?: { airport: string; time: Date };
  confirmation?: string;
  checkIn?: Date;
  checkOut?: Date;
  address?: string;
  duration?: number;
  cost?: number;
  bookingUrl?: string;
  checklistItems?: ChecklistItem[];
};

export type ItineraryItem = {
  id: string;
  tripId: string;
  dayKey?: string | null;
  date?: Date;
  unscheduledGroupId?: string | null;
  order?: number;
  type: ItineraryItemType;
  title: string;
  startTime?: Date;
  endTime?: Date;
  locationId?: string;
  details?: ItineraryItemDetails;
  note?: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TripBooking = {
  id: string;
  tripId: string;
  type: "flight" | "hotel";
  title: string;
  date: Date;
  dayKey?: string | null;
  unscheduledGroupId?: string | null;
  order?: number;
  startTime?: Date;
  details?: ItineraryItemDetails;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TimelineEntry =
  | { kind: "itinerary"; item: ItineraryItem }
  | { kind: "booking"; booking: TripBooking }
  | { kind: "day"; day: ItineraryDay; dayKey: string }
  | { kind: "group"; group: UnscheduledGroup }
  | { kind: "separator"; label: string };
