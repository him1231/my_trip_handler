import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DaySelector from "../components/DaySelector";
import InviteLink from "../components/InviteLink";
import ItineraryDay from "../components/ItineraryDay";
import MapPanel from "../components/MapPanel";
import TabButton from "../components/TabButton";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../lib/auth";
import {
  addItem,
  addLocation,
  createDay,
  deleteTrip,
  subscribeDays,
  subscribeItems,
  subscribeLocations,
  subscribeTrip
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
  const [activeTab, setActiveTab] = useState<"itinerary" | "map" | "expenses" | "journal">("itinerary");

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
      setDays(nextDays);
      if (!selectedDayId && nextDays.length) {
        setSelectedDayId(nextDays[0].id);
      }
      if (selectedDayId && !nextDays.find((day) => day.id === selectedDayId)) {
        setSelectedDayId(nextDays[0]?.id ?? null);
      }
    });
    return unsubscribe;
  }, [tripId, selectedDayId]);

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

  const handleAddDay = async () => {
    if (!tripId || !canEdit) {
      return;
    }
    const lastDay = days[days.length - 1];
    const nextDayNumber = lastDay ? lastDay.dayNumber + 1 : 1;
    const nextDate = lastDay ? new Date(lastDay.date) : new Date();
    if (lastDay) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    await createDay(tripId, nextDayNumber, nextDate);
  };

  const handleAddItem = async (payload: {
    title: string;
    type: ItineraryItem["type"];
    note?: string;
    startTime?: Date;
  }) => {
    if (!tripId || !selectedDayId || !user) {
      return;
    }
    await addItem(tripId, selectedDayId, {
      ...payload,
      createdBy: user.uid
    });
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

  if (!tripId) {
    return <p className="text-sm text-muted-foreground">Missing trip id.</p>;
  }

  if (!trip) {
    return <p className="text-sm text-muted-foreground">Loading trip details...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold">{trip.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Role: {role ?? "unknown"} · Members: {trip.memberIds.length}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {trip.inviteToken && (role === "owner" || role === "editor") ? (
            <InviteLink token={trip.inviteToken} />
          ) : null}
          {isOwner ? (
            <Button variant="outline" onClick={handleDeleteTrip}>
              Delete trip
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <TabButton label="Itinerary" active={activeTab === "itinerary"} onClick={() => setActiveTab("itinerary")} />
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
          />
        </div>
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
