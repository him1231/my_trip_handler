import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "./firebase";
import { createInviteToken } from "./token";
import {
  ItineraryDay,
  ItineraryItem,
  Trip,
  TripLocation,
  TripMember,
  TripRole
} from "./types";

const tripsCollection = collection(db, "trips");

const mapTrip = (id: string, data: any): Trip => ({
  id,
  title: data.title,
  ownerId: data.ownerId,
  inviteToken: data.inviteToken,
  memberIds: data.memberIds ?? [],
  members: data.members ?? {},
  createdAt: data.createdAt?.toDate?.() ?? undefined,
  updatedAt: data.updatedAt?.toDate?.() ?? undefined
});

const mapDay = (id: string, tripId: string, data: any): ItineraryDay => ({
  id,
  tripId,
  date: data.date?.toDate?.() ?? new Date(),
  dayNumber: data.dayNumber ?? 1,
  note: data.note,
  createdAt: data.createdAt?.toDate?.() ?? undefined,
  updatedAt: data.updatedAt?.toDate?.() ?? undefined
});

const mapItem = (id: string, tripId: string, dayId: string, data: any): ItineraryItem => ({
  id,
  tripId,
  dayId,
  type: data.type,
  title: data.title,
  startTime: data.startTime?.toDate?.() ?? undefined,
  endTime: data.endTime?.toDate?.() ?? undefined,
  locationId: data.locationId,
  details: data.details,
  note: data.note,
  createdBy: data.createdBy,
  createdAt: data.createdAt?.toDate?.() ?? undefined,
  updatedAt: data.updatedAt?.toDate?.() ?? undefined
});

export const createTrip = async (title: string, user: User) => {
  const tripRef = doc(tripsCollection);
  const inviteToken = createInviteToken();
  const member: TripMember = {
    role: "owner",
    displayName: user.displayName,
    photoURL: user.photoURL
  };

  await setDoc(tripRef, {
    title,
    ownerId: user.uid,
    inviteToken,
    memberIds: [user.uid],
    members: {
      [user.uid]: member
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return tripRef.id;
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
  const q = query(daysRef, orderBy("dayNumber", "asc"));
  return onSnapshot(q, (snapshot) => {
    const days = snapshot.docs.map((docSnap) => mapDay(docSnap.id, tripId, docSnap.data()));
    onChange(days);
  });
};

export const createDay = async (tripId: string, dayNumber: number, date: Date) => {
  const daysRef = collection(db, "trips", tripId, "days");
  await addDoc(daysRef, {
    date,
    dayNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(tripsCollection, tripId), {
    updatedAt: serverTimestamp()
  });
};

export const subscribeItems = (
  tripId: string,
  dayId: string,
  onChange: (items: ItineraryItem[]) => void
) => {
  const itemsRef = collection(db, "trips", tripId, "days", dayId, "items");
  const q = query(itemsRef, orderBy("startTime", "asc"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => mapItem(docSnap.id, tripId, dayId, docSnap.data()));
    onChange(items);
  });
};

export const addItem = async (
  tripId: string,
  dayId: string,
  item: Omit<ItineraryItem, "id" | "tripId" | "dayId" | "createdAt" | "updatedAt">
) => {
  const itemsRef = collection(db, "trips", tripId, "days", dayId, "items");
  await addDoc(itemsRef, {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
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
