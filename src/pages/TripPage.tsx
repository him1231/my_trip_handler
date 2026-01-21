import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DaySelector from "../components/DaySelector";
import ShareDialog from "../components/ShareDialog";
import ItineraryDay from "../components/ItineraryDay";
import MapPanel from "../components/MapPanel";
import TabButton from "../components/TabButton";
import TripBookingsTab from "../components/TripBookingsTab";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../lib/auth";
import {
  addItem,
  addLocation,
  addBooking,
  createDay,
  deleteDay,
  deleteBooking,
  deleteTrip,
  subscribeDays,
  subscribeItems,
  subscribeLocations,
  subscribeTrip,
  updateTripDestinationPlaceId,
  updateBooking
} from "../lib/firestore";
import { ItineraryDay as DayType, ItineraryItem, Trip, TripLocation } from "../lib/types";

const TripPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [locations, setLocations] = useState<TripLocation[]>([]);
  const [days, setDays] = useState<DayType[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [pending, setPending] = useState<{ lat: number; lng: number; name?: string; address?: string } | null>(
    null
  );
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"itinerary" | "bookings" | "map" | "expenses" | "journal">("itinerary");

  useEffect(() => {
    if (!tripId) {
      return;
    }
    const unsubscribe = subscribeTrip(tripId, setTrip);
    return unsubscribe;
  }, [tripId]);

  useEffect(() => {
    if (!tripId) {
      return;
    }
    const unsubscribe = subscribeLocations(tripId, setLocations);
    return unsubscribe;
  }, [tripId]);

  useEffect(() => {
    if (!tripId) {
      return;
    }
    const unsubscribe = subscribeDays(tripId, (nextDays) => {
      const startDate = trip?.startDate ? new Date(trip.startDate) : null;
      if (startDate) {
        startDate.setHours(0, 0, 0, 0);
      }
      const normalized = nextDays.map((day) => {
        if (!startDate) {
          return day;
        }
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((dayDate.getTime() - startDate.getTime()) / 86400000);
        return {
          ...day,
          dayNumber: diffDays + 1
        };
      });

      setDays(normalized);
      if (!selectedDayId && normalized.length) {
        setSelectedDayId(normalized[0].id);
      }
      if (selectedDayId && !normalized.find((day) => day.id === selectedDayId)) {
        setSelectedDayId(normalized[0]?.id ?? null);
      }
    });
    return unsubscribe;
  }, [tripId, selectedDayId, trip?.startDate]);

  useEffect(() => {
    if (!tripId || !selectedDayId) {
      setItems([]);
      return;
    }
    const unsubscribe = subscribeItems(tripId, selectedDayId, setItems);
    return unsubscribe;
  }, [tripId, selectedDayId]);

  useEffect(() => {
    if (pending?.name) {
      setName(pending.name);
    }
  }, [pending]);

  const role = useMemo(() => {
    if (!user || !trip) {
      return null;
    }
    return trip.members?.[user.uid]?.role ?? null;
  }, [trip, user]);

  const canEdit = role === "owner" || role === "editor";
  const isOwner = role === "owner";

  const selectedDay = days.find((day) => day.id === selectedDayId) ?? null;

  const handleAddDay = async (date: Date) => {
    if (!tripId || !canEdit) {
      return;
    }
    const startDate = trip?.startDate ? new Date(trip.startDate) : null;
    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
    }
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    let dayNumber = 1;
    if (startDate) {
      dayNumber = Math.floor((targetDate.getTime() - startDate.getTime()) / 86400000) + 1;
    } else {
      const sorted = [...days].sort((a, b) => a.date.getTime() - b.date.getTime());
      const insertIndex = sorted.findIndex((day) => day.date.getTime() > targetDate.getTime());
      dayNumber = insertIndex === -1 ? sorted.length + 1 : insertIndex + 1;
    }
    await createDay(tripId, dayNumber, targetDate);
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!tripId || !canEdit) {
      return;
    }
    const confirmed = window.confirm("Delete this day and its items?");
    if (!confirmed) {
      return;
    }
    await deleteDay(tripId, dayId);
  };

  const handleAddItem = async (payload: {
    title: string;
    type: ItineraryItem["type"];
    note?: string;
    startTime?: Date;
    details?: ItineraryItem["details"];
  }) => {
    if (!tripId || !selectedDayId || !user) {
      return;
    }
    await addItem(tripId, selectedDayId, {
      ...payload,
      createdBy: user.uid
    });
  };

  const handleAddBookingItem = async (payload: {
    title: string;
    type: "flight" | "hotel";
    details: ItineraryItem["details"];
    startTime?: Date;
    date: Date;
  }) => {
    if (!tripId || !user) {
      return;
    }

    await addBooking(tripId, {
      title: payload.title,
      type: payload.type,
      details: payload.details,
      startTime: payload.startTime,
      date: payload.date,
      createdBy: user.uid
    });
  };

  const handleUpdateBookingItem = async (payload: {
    bookingId: string;
    title: string;
    type: "flight" | "hotel";
    details: ItineraryItem["details"];
    startTime?: Date;
    date: Date;
  }) => {
    if (!tripId || !user) {
      return;
    }
    await updateBooking(tripId, payload.bookingId, {
      title: payload.title,
      type: payload.type,
      details: payload.details,
      startTime: payload.startTime,
      date: payload.date
    });
  };

  const handleDeleteBookingItem = async (bookingId: string) => {
    if (!tripId || !canEdit) {
      return;
    }
    const confirmed = window.confirm("Delete this booking?");
    if (!confirmed) {
      return;
    }
    await deleteBooking(tripId, bookingId);
  };

  const handleDeleteTrip = async () => {
    if (!tripId || !isOwner) {
      return;
    }
    const confirmed = window.confirm("Delete this trip? This cannot be undone.");
    if (!confirmed) {
      return;
    }
    await deleteTrip(tripId);
    navigate("/");
  };

  const handleSaveLocation = async () => {
    if (!tripId || !pending || !user || !name.trim()) {
      return;
    }
    setSaving(true);
    try {
      await addLocation(tripId, {
        name: name.trim(),
        lat: pending.lat,
        lng: pending.lng,
        address: pending.address,
        note: note.trim() || undefined,
        createdBy: user.uid
      });
      setPending(null);
      setName("");
      setNote("");
    } finally {
      setSaving(false);
    }
  };

  const handleDestinationPlaceId = async (placeId: string) => {
    if (!tripId || !canEdit || trip?.destinationPlaceId === placeId) {
      return;
    }
    await updateTripDestinationPlaceId(tripId, placeId);
  };

  if (!tripId) {
    return <p className="text-sm text-muted-foreground">Missing trip id.</p>;
  }

  if (!trip) {
    return <p className="text-sm text-muted-foreground">Loading trip details...</p>;
  }

  const tripStart = trip.startDate ? new Date(trip.startDate) : null;
  const tripEnd = trip.endDate ? new Date(trip.endDate) : null;
  const tripDuration =
    tripStart && tripEnd
      ? Math.floor((tripEnd.getTime() - tripStart.getTime()) / 86400000) + 1
      : null;

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{trip.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Role: {role ?? "unknown"} · Members: {trip.memberIds.length}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {trip.destination ? <span>{trip.destination}</span> : <span>No destination</span>}
              {tripStart && tripEnd ? (
                <span>
                  · {tripStart.toLocaleDateString()} → {tripEnd.toLocaleDateString()}
                </span>
              ) : null}
              {tripDuration ? <span>· {tripDuration} days</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {trip.inviteToken && (role === "owner" || role === "editor") ? (
              <ShareDialog inviteToken={trip.inviteToken} />
            ) : null}
            {isOwner ? (
              <Button variant="outline" onClick={handleDeleteTrip}>
                Delete trip
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <TabButton label="Itinerary" active={activeTab === "itinerary"} onClick={() => setActiveTab("itinerary")} />
        <TabButton label="Bookings" active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")} />
        <TabButton label="Map" active={activeTab === "map"} onClick={() => setActiveTab("map")} />
        <TabButton label="Expenses" active={activeTab === "expenses"} onClick={() => setActiveTab("expenses")} />
        <TabButton label="Journal" active={activeTab === "journal"} onClick={() => setActiveTab("journal")} />
      </div>

      {activeTab === "itinerary" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,360px)_1fr]">
          <DaySelector
            days={days}
            selectedDayId={selectedDayId}
            onSelect={setSelectedDayId}
            onAdd={handleAddDay}
            onDelete={handleDeleteDay}
            canEdit={canEdit}
          />
          {selectedDay ? (
            <ItineraryDay day={selectedDay} items={items} canEdit={canEdit} onAddItem={handleAddItem} />
          ) : (
            <Card className="p-6">
              <h3 className="text-lg font-semibold">No day selected</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add a day to start planning your itinerary.
              </p>
            </Card>
          )}
        </div>
      ) : null}

      {activeTab === "map" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,360px)_1fr]">
          <Card className="flex flex-col gap-4 p-5">
            <div>
              <h3 className="text-lg font-semibold">Locations</h3>
              <p className="text-sm text-muted-foreground">Click the map to add a location.</p>
            </div>

            {pending ? (
              <Card className="bg-slate-50 p-4">
                <h4 className="text-base font-semibold">Selected spot</h4>
                <p className="text-sm text-muted-foreground">
                  {pending.lat.toFixed(4)}, {pending.lng.toFixed(4)}
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  <Input
                    type="text"
                    placeholder="Location name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                  <Textarea
                    placeholder="Notes for the group"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={handleSaveLocation} disabled={!canEdit || saving}>
                      {saving ? "Saving..." : "Add to trip"}
                    </Button>
                    <Button variant="outline" onClick={() => setPending(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Select a spot on the map to add it here.</p>
            )}

            <div className="flex flex-col gap-3">
              {locations.map((location) => (
                <Card key={location.id} className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm font-semibold">{location.name}</strong>
                    <Badge variant="outline">
                      {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
                    </Badge>
                  </div>
                  {location.note ? (
                    <p className="mt-2 text-sm text-muted-foreground">{location.note}</p>
                  ) : null}
                  {location.address ? (
                    <p className="text-sm text-muted-foreground">{location.address}</p>
                  ) : null}
                </Card>
              ))}
            </div>
          </Card>

          <MapPanel
            locations={locations}
            onSelect={setPending}
            canEdit={canEdit}
            destination={trip.destination}
            destinationPlaceId={trip.destinationPlaceId}
            onDestinationPlaceId={handleDestinationPlaceId}
          />
        </div>
      ) : null}

      {activeTab === "bookings" && tripId ? (
        <TripBookingsTab
          tripId={tripId}
          canEdit={canEdit}
          onAddItem={handleAddBookingItem}
          onUpdateItem={handleUpdateBookingItem}
          onDeleteItem={handleDeleteBookingItem}
        />
      ) : null}

      {activeTab === "expenses" ? (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Expenses</h3>
          <p className="mt-2 text-sm text-muted-foreground">Expense tracking is coming next.</p>
        </Card>
      ) : null}

      {activeTab === "journal" ? (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Journal</h3>
          <p className="mt-2 text-sm text-muted-foreground">Trip journaling is coming next.</p>
        </Card>
      ) : null}
    </div>
  );
};

export default TripPage;
