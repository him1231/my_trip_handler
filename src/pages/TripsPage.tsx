import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TripList from "../components/TripList";
import { useAuth } from "../lib/auth";
import { createTrip, subscribeTrips } from "../lib/firestore";
import { Trip } from "../lib/types";

const TripsPage = () => {
  const { user, loading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setTrips([]);
      setError(null);
      return;
    }
    const unsubscribe = subscribeTrips(user.uid, setTrips, (err) => {
      console.error(err);
      setError("Unable to load your trips. Check Firestore rules or indexes.");
    });
    return unsubscribe;
  }, [user]);

  const handleCreate = async () => {
    if (!user || !title.trim()) {
      return;
    }
    setCreating(true);
    try {
      const tripId = await createTrip(title.trim(), user);
      setTitle("");
      navigate(`/trip/${tripId}`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <p className="muted">Loading your workspace...</p>;
  }

  if (!user) {
    return (
      <div className="card">
        <h2>Welcome</h2>
        <p className="muted">
          Sign in to start planning trips with your friends. You can invite co-editors with a
          shareable link.
        </p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="card">
        <h2>Create a new trip</h2>
        <div className="inline-actions">
          <input
            type="text"
            placeholder="Summer in Seoul"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button
            className="primary-button"
            onClick={handleCreate}
            disabled={creating || !title.trim()}
          >
            {creating ? "Creating..." : "Create trip"}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Your trips</h3>
        {error ? <p className="muted">{error}</p> : null}
        <TripList trips={trips} />
      </div>
    </div>
  );
};

export default TripsPage;
