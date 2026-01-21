import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import DaySelector from "../components/DaySelector";
import InviteLink from "../components/InviteLink";
import ItineraryDay from "../components/ItineraryDay";
import MapPanel from "../components/MapPanel";
import TabButton from "../components/TabButton";
import { useAuth } from "../lib/auth";
import {
  addItem,
  addLocation,
  createDay,
  subscribeDays,
  subscribeItems,
  subscribeLocations,
  subscribeTrip
} from "../lib/firestore";
import { ItineraryDay as DayType, ItineraryItem, Trip, TripLocation } from "../lib/types";

const TripPage = () => {
  const { tripId } = useParams();
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
    return <p className="muted">Missing trip id.</p>;
  }

  if (!trip) {
    return <p className="muted">Loading trip details...</p>;
  }

  return (
    <div className="page-container">
      <div className="card">
        <h2>{trip.title}</h2>
        <p className="muted">
          Role: {role ?? "unknown"} · Members: {trip.memberIds.length}
        </p>
        {trip.inviteToken && (role === "owner" || role === "editor") ? (
          <InviteLink token={trip.inviteToken} />
        ) : null}
      </div>

      <div className="inline-actions">
        <TabButton label="Itinerary" active={activeTab === "itinerary"} onClick={() => setActiveTab("itinerary")} />
        <TabButton label="Map" active={activeTab === "map"} onClick={() => setActiveTab("map")} />
        <TabButton label="Expenses" active={activeTab === "expenses"} onClick={() => setActiveTab("expenses")} />
        <TabButton label="Journal" active={activeTab === "journal"} onClick={() => setActiveTab("journal")} />
      </div>

      {activeTab === "itinerary" ? (
        <div className="split-view">
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
            <div className="card">
              <h3>No day selected</h3>
              <p className="muted">Add a day to start planning your itinerary.</p>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "map" ? (
        <div className="split-view">
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h3>Locations</h3>
              <p className="muted">Click the map to add a location.</p>
            </div>

            {pending ? (
              <div className="card" style={{ background: "#f8fafc" }}>
                <h4>Selected spot</h4>
                <p className="muted">
                  {pending.lat.toFixed(4)}, {pending.lng.toFixed(4)}
                </p>
                <div className="list">
                  <input
                    type="text"
                    placeholder="Location name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                  <textarea
                    placeholder="Notes for the group"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                  <div className="inline-actions">
                    <button
                      className="primary-button"
                      onClick={handleSaveLocation}
                      disabled={!canEdit || saving}
                    >
                      {saving ? "Saving..." : "Add to trip"}
                    </button>
                    <button className="secondary-button" onClick={() => setPending(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted">Select a spot on the map to add it here.</p>
            )}

            <div className="list">
              {locations.map((location) => (
                <div key={location.id} className="card" style={{ padding: 12 }}>
                  <div className="inline-actions">
                    <strong>{location.name}</strong>
                    <span className="tag">
                      {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
                    </span>
                  </div>
                  {location.note ? <p className="muted">{location.note}</p> : null}
                  {location.address ? <p className="muted">{location.address}</p> : null}
                </div>
              ))}
            </div>
          </div>

          <MapPanel locations={locations} onSelect={setPending} canEdit={canEdit} />
        </div>
      ) : null}

      {activeTab === "expenses" ? (
        <div className="card">
          <h3>Expenses</h3>
          <p className="muted">Expense tracking is coming next.</p>
        </div>
      ) : null}

      {activeTab === "journal" ? (
        <div className="card">
          <h3>Journal</h3>
          <p className="muted">Trip journaling is coming next.</p>
        </div>
      ) : null}
    </div>
  );
};

export default TripPage;
