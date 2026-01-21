import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TripList from "../components/TripList";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
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
    return <p className="text-sm text-muted-foreground">Loading your workspace...</p>;
  }

  if (!user) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Welcome</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to start planning trips with your friends. You can invite co-editors with a
          shareable link.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Create a new trip</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Input
            type="text"
            placeholder="Summer in Seoul"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Button onClick={handleCreate} disabled={creating || !title.trim()}>
            {creating ? "Creating..." : "Create trip"}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold">Your trips</h3>
        {error ? <p className="mt-2 text-sm text-muted-foreground">{error}</p> : null}
        <div className="mt-4">
          <TripList trips={trips} />
        </div>
      </Card>
    </div>
  );
};

export default TripsPage;
