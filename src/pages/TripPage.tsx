import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import InviteLink from "../components/InviteLink";
import MapPanel from "../components/MapPanel";
import { useAuth } from "../lib/auth";
import { addLocation, subscribeLocations, subscribeTrip } from "../lib/firestore";
import { Trip, TripLocation } from "../lib/types";

const TripPage = () => {
  const { tripId } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [locations, setLocations] = useState<TripLocation[]>([]);
  const [pending, setPending] = useState<{ lat: number; lng: number; name?: string; address?: string } | null>(
    null
  );
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

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

        <MapPanel
          locations={locations}
          onSelect={setPending}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
};

export default TripPage;
