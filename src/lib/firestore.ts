import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "./firebase";
import { createInviteToken } from "./token";
import {
  ItineraryDay,
  ItineraryItem,
  ItineraryItemDetails,
  Trip,
  TripBooking,
  TripLocation,
  TripMember,
  TripRole,
  UnscheduledGroup
} from "./types";
import { HkiaFlightInfoResponse, HkiaLanguage } from "./hkiaFlightInfo";

const tripsCollection = collection(db, "trips");
const hkiaCacheCollection = collection(db, "hkiaCache");

const mapTrip = (id: string, data: any): Trip => ({
  id,
  title: data.title,
  description: data.description,
  destination: data.destination,
  destinationPlaceId: data.destinationPlaceId,
  startDate: data.startDate?.toDate?.() ?? undefined,
  endDate: data.endDate?.toDate?.() ?? undefined,
  timezone: data.timezone,
  template: data.template,
  ownerId: data.ownerId,
  inviteToken: data.inviteToken,
  memberIds: data.memberIds ?? [],
  members: data.members ?? {},
  createdAt: data.createdAt?.toDate?.() ?? undefined,
  updatedAt: data.updatedAt?.toDate?.() ?? undefined
});

type TripCreateOptions = {
  description?: string;
  destination?: string;
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
  template?: string;
};

const mapDay = (id: string, tripId: string, data: any): ItineraryDay => ({
  id,
  tripId,
  date: data.date?.toDate?.() ?? new Date(),
  dayNumber: data.dayNumber ?? 1,
  note: data.note,
  createdAt: data.createdAt?.toDate?.() ?? undefined,
  updatedAt: data.updatedAt?.toDate?.() ?? undefined
});

const mapUnscheduledGroup = (id: string, tripId: string, data: any): UnscheduledGroup => ({
  id,
  tripId,
  title: data.title ?? "Unscheduled",
  order: data.order ?? 0,
  isDefault: data.isDefault ?? false,
  createdAt: data.createdAt?.toDate?.() ?? undefined,
  updatedAt: data.updatedAt?.toDate?.() ?? undefined
});

const toDateValue = (value?: unknown): Date | undefined => {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const mapDetailsDates = (details?: ItineraryItemDetails) => {
  if (!details) {
    return details;
  }
  return {
    ...details,
    departure: details.departure
      ? {
        ...details.departure,
        time: toDateValue(details.departure.time) ?? details.departure.time
      }
      : undefined,
    arrival: details.arrival
      ? {
        ...details.arrival,
        time: toDateValue(details.arrival.time) ?? details.arrival.time
      }
      : undefined,
    checkIn: toDateValue(details.checkIn) ?? details.checkIn,
    checkOut: toDateValue(details.checkOut) ?? details.checkOut
  };
};

const mapItem = (id: string, tripId: string, data: any): ItineraryItem => ({
  id,
  tripId,
  dayKey: data.dayKey,
  unscheduledGroupId: data.unscheduledGroupId ?? null,
  date: data.date?.toDate?.() ?? new Date(),
  order: data.order,
  type: data.type,
  title: data.title,
  startTime: data.startTime?.toDate?.() ?? undefined,
  endTime: data.endTime?.toDate?.() ?? undefined,
  locationId: data.locationId,
  details: mapDetailsDates(data.details),
  note: data.note,
  createdBy: data.createdBy,
  createdAt: data.createdAt?.toDate?.() ?? undefined,
  updatedAt: data.updatedAt?.toDate?.() ?? undefined
});

const mapBooking = (id: string, tripId: string, data: any): TripBooking => ({
  id,
  tripId,
  type: data.type,
  title: data.title,
  date: data.date?.toDate?.() ?? new Date(),
  dayKey: data.dayKey,
  unscheduledGroupId: data.unscheduledGroupId ?? null,
  order: data.order,
  startTime: data.startTime?.toDate?.() ?? undefined,
  details: mapDetailsDates(data.details),
  createdBy: data.createdBy,
  createdAt: data.createdAt?.toDate?.() ?? undefined,
  updatedAt: data.updatedAt?.toDate?.() ?? undefined
});

const removeUndefined = <T>(value: T): T => {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => removeUndefined(entry)) as T;
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      if (entry === undefined) {
        return;
      }
      result[key] = removeUndefined(entry);
    });
    return result as T;
  }
  return value;
};

export const createTrip = async (
  titleOrPayload: string | ({ title: string } & TripCreateOptions),
  user: User,
  options?: TripCreateOptions
) => {
  const payload = typeof titleOrPayload === "string" ? { title: titleOrPayload, ...options } : titleOrPayload;
  const tripRef = doc(tripsCollection);
  const inviteToken = createInviteToken();
  const member: TripMember = {
    role: "owner",
    displayName: user.displayName,
    photoURL: user.photoURL
  };

  const tripPayload = {
    title: payload.title,
    description: payload.description ?? undefined,
    destination: payload.destination ?? undefined,
    startDate: payload.startDate ?? undefined,
    endDate: payload.endDate ?? undefined,
    timezone: payload.timezone ?? undefined,
    template: payload.template ?? "custom",
    ownerId: user.uid,
    inviteToken,
    memberIds: [user.uid],
    members: {
      [user.uid]: member
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  Object.keys(tripPayload).forEach((key) => {
    if ((tripPayload as Record<string, unknown>)[key] === undefined) {
      delete (tripPayload as Record<string, unknown>)[key];
    }
  });

  await setDoc(tripRef, tripPayload);

  return tripRef.id;
};

export const createTripWithDays = async (
  payload: { title: string } & TripCreateOptions,
  user: User,
  autoCreateDays: boolean
) => {
  const tripId = await createTrip(payload, user);

  if (autoCreateDays && payload.startDate && payload.endDate) {
    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (totalDays > 0 && totalDays <= 366) {
      const daysRef = collection(db, "trips", tripId, "days");
      for (let index = 0; index < totalDays; index += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        await addDoc(daysRef, {
          date,
          dayNumber: index + 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      await updateDoc(doc(tripsCollection, tripId), {
        updatedAt: serverTimestamp()
      });
    }
  }

  return tripId;
};

export const subscribeTrips = (
  uid: string,
  onChange: (trips: Trip[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(tripsCollection, where("memberIds", "array-contains", uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const trips = snapshot.docs.map((docSnap) => mapTrip(docSnap.id, docSnap.data()));
      onChange(trips);
    },
    (error) => {
      onError?.(error);
    }
  );
};

export const subscribeTrip = (tripId: string, onChange: (trip: Trip | null) => void) => {
  const tripRef = doc(tripsCollection, tripId);
  return onSnapshot(tripRef, (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }
    onChange(mapTrip(snapshot.id, snapshot.data()));
  });
};

export const subscribeLocations = (
  tripId: string,
  onChange: (locations: TripLocation[]) => void
) => {
  const locationsRef = collection(db, "trips", tripId, "locations");
  const q = query(locationsRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const locations = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<TripLocation, "id">),
      createdAt: docSnap.data().createdAt?.toDate?.() ?? undefined
    }));
    onChange(locations);
  });
};

export const addLocation = async (
  tripId: string,
  location: Omit<TripLocation, "id" | "createdAt">
) => {
  const locationsRef = collection(db, "trips", tripId, "locations");
  await addDoc(locationsRef, {
    ...location,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(tripsCollection, tripId), {
    updatedAt: serverTimestamp()
  });
};

export const subscribeDays = (
  tripId: string,
  onChange: (days: ItineraryDay[]) => void
) => {
  const daysRef = collection(db, "trips", tripId, "days");
  const q = query(daysRef, orderBy("date", "asc"));
  return onSnapshot(q, (snapshot) => {
    const days = snapshot.docs.map((docSnap) => mapDay(docSnap.id, tripId, docSnap.data()));
    onChange(days);
  });
};

export const subscribeUnscheduledGroups = (
  tripId: string,
  onChange: (groups: UnscheduledGroup[]) => void
) => {
  const groupsRef = collection(db, "trips", tripId, "unscheduledGroups");
  const q = query(groupsRef, orderBy("order", "asc"));
  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map((docSnap) =>
      mapUnscheduledGroup(docSnap.id, tripId, docSnap.data())
    );
    onChange(groups);
  });
};

export const createDay = async (tripId: string, dayNumber: number, date: Date) => {
  const daysRef = collection(db, "trips", tripId, "days");
  const dayDoc = await addDoc(daysRef, {
    date,
    dayNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(tripsCollection, tripId), {
    updatedAt: serverTimestamp()
  });
  return dayDoc.id;
};

export const updateDay = async (
  tripId: string,
  dayId: string,
  payload: Partial<Pick<ItineraryDay, "date" | "note" | "dayNumber">>
) => {
  const dayRef = doc(db, "trips", tripId, "days", dayId);
  await updateDoc(dayRef, {
    ...removeUndefined(payload),
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(tripsCollection, tripId), {
    updatedAt: serverTimestamp()
  });
};

export const createUnscheduledGroup = async (
  tripId: string,
  payload: { title: string; order: number; isDefault?: boolean }
) => {
  const groupsRef = collection(db, "trips", tripId, "unscheduledGroups");
  const groupDoc = await addDoc(groupsRef, {
    title: payload.title,
    order: payload.order,
    isDefault: payload.isDefault ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(tripsCollection, tripId), {
    updatedAt: serverTimestamp()
  });
  return groupDoc.id;
};

export const updateUnscheduledGroup = async (
  tripId: string,
  groupId: string,
  payload: Partial<Pick<UnscheduledGroup, "title" | "order" | "isDefault">>
) => {
  const groupRef = doc(db, "trips", tripId, "unscheduledGroups", groupId);
  await updateDoc(groupRef, {
    ...removeUndefined(payload),
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(tripsCollection, tripId), {
    updatedAt: serverTimestamp()
  });
};

export const deleteUnscheduledGroup = async (tripId: string, groupId: string) => {
  await deleteDoc(doc(db, "trips", tripId, "unscheduledGroups", groupId));
  await updateDoc(doc(tripsCollection, tripId), {
    updatedAt: serverTimestamp()
  });
};

export const subscribeItinerary = (
  tripId: string,
  onChange: (items: ItineraryItem[]) => void
) => {
  const itemsRef = collection(db, "trips", tripId, "itinerary");
  return onSnapshot(itemsRef, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => mapItem(docSnap.id, tripId, docSnap.data()));
    onChange(items);
  });
};

export const subscribeBookings = (
  tripId: string,
  onChange: (bookings: TripBooking[]) => void
) => {
  const bookingsRef = collection(db, "trips", tripId, "bookings");
  const q = query(bookingsRef, orderBy("date", "asc"));
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map((docSnap) => mapBooking(docSnap.id, tripId, docSnap.data()));
    onChange(bookings);
  });
};

export const addItem = async (
  tripId: string,
  item: Omit<ItineraryItem, "id" | "tripId" | "createdAt" | "updatedAt">
) => {
  const itemsRef = collection(db, "trips", tripId, "itinerary");
  await addDoc(itemsRef, {
    ...removeUndefined(item),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(tripsCollection, tripId), {
    updatedAt: serverTimestamp()
  });
};

export const addBooking = async (
  tripId: string,
  booking: Omit<TripBooking, "id" | "tripId" | "createdAt" | "updatedAt">
) => {
  const bookingsRef = collection(db, "trips", tripId, "bookings");
  await addDoc(bookingsRef, {
    ...removeUndefined(booking),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(tripsCollection, tripId), {
    updatedAt: serverTimestamp()
  });
};

export const updateBooking = async (
  tripId: string,
  bookingId: string,
  booking: Partial<Omit<TripBooking, "id" | "tripId" | "createdAt">>
) => {
  const bookingRef = doc(db, "trips", tripId, "bookings", bookingId);
  await updateDoc(bookingRef, {
    ...removeUndefined(booking),
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(tripsCollection, tripId), {
    updatedAt: serverTimestamp()
  });
};

export const deleteBooking = async (tripId: string, bookingId: string) => {
  await deleteDoc(doc(db, "trips", tripId, "bookings", bookingId));
  await updateDoc(doc(tripsCollection, tripId), {
    updatedAt: serverTimestamp()
  });
};

export const updateItem = async (
  tripId: string,
  itemId: string,
  item: Partial<Omit<ItineraryItem, "id" | "tripId" | "createdAt">>
) => {
  const itemRef = doc(db, "trips", tripId, "itinerary", itemId);
  await updateDoc(itemRef, {
    ...removeUndefined(item),
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(tripsCollection, tripId), {
    updatedAt: serverTimestamp()
  });
};

export const deleteDay = async (tripId: string, dayId: string) => {
  await deleteDoc(doc(db, "trips", tripId, "days", dayId));
  await updateDoc(doc(tripsCollection, tripId), {
    updatedAt: serverTimestamp()
  });
};

export const ensureMembershipByToken = async (token: string, user: User) => {
  const q = query(tripsCollection, where("inviteToken", "==", token), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }

  const docSnap = snapshot.docs[0];
  const data = docSnap.data();
  const tripId = docSnap.id;
  const memberKey = `members.${user.uid}`;
  const member: TripMember = {
    role: "editor",
    displayName: user.displayName,
    photoURL: user.photoURL
  };

  if (!data.memberIds?.includes(user.uid)) {
    await updateDoc(doc(tripsCollection, tripId), {
      memberIds: arrayUnion(user.uid),
      [memberKey]: member,
      updatedAt: serverTimestamp()
    });
  }

  return tripId;
};

export const updateMemberRole = async (tripId: string, uid: string, role: TripRole) => {
  const memberKey = `members.${uid}.role`;
  await updateDoc(doc(tripsCollection, tripId), {
    [memberKey]: role,
    updatedAt: serverTimestamp()
  });
};

const buildHkiaCacheId = (params: {
  date: string;
  arrival: boolean;
  cargo: boolean;
  lang: HkiaLanguage;
}) => {
  const leg = params.arrival ? "arr" : "dep";
  const cargo = params.cargo ? "cargo" : "pax";
  return `${params.date}_${leg}_${cargo}_${params.lang}`;
};

export const getHkiaCacheEntry = async (params: {
  date: string;
  arrival: boolean;
  cargo: boolean;
  lang: HkiaLanguage;
}): Promise<HkiaFlightInfoResponse | null> => {
  const docId = buildHkiaCacheId(params);
  const snapshot = await getDoc(doc(hkiaCacheCollection, docId));
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.data();
  const createdAt = data.createdAt?.toDate?.() as Date | undefined;
  if (createdAt) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);
    if (createdAt < cutoff) {
      return null;
    }
  }
  const response = data.response as HkiaFlightInfoResponse | HkiaFlightInfoResponse[] | undefined;
  if (!response) {
    return null;
  }
  if (Array.isArray(response)) {
    return response[0] ?? null;
  }
  return response;
};

export const setHkiaCacheEntry = async (
  params: {
    date: string;
    arrival: boolean;
    cargo: boolean;
    lang: HkiaLanguage;
  },
  response: HkiaFlightInfoResponse
) => {
  const docId = buildHkiaCacheId(params);
  await setDoc(doc(hkiaCacheCollection, docId), {
    date: params.date,
    arrival: params.arrival,
    cargo: params.cargo,
    lang: params.lang,
    response,
    createdAt: serverTimestamp()
  });
};

export const pruneHkiaCache = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  cutoff.setHours(0, 0, 0, 0);
  const q = query(
    hkiaCacheCollection,
    where("createdAt", "<", Timestamp.fromDate(cutoff)),
    limit(50)
  );
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
};

export const deleteTrip = async (tripId: string) => {
  await deleteDoc(doc(tripsCollection, tripId));
};

export const updateTripDestinationPlaceId = async (tripId: string, placeId: string) => {
  await updateDoc(doc(tripsCollection, tripId), {
    destinationPlaceId: placeId,
    updatedAt: serverTimestamp()
  });
};
