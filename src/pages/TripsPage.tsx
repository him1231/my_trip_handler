import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateTripModeToggle from "../components/CreateTripModeToggle";
import CreateTripWizard from "../components/CreateTripWizard";
import QuickCreateTrip from "../components/QuickCreateTrip";
import TripList from "../components/TripList";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../lib/auth";
import { createTrip, createTripWithDays, subscribeTrips } from "../lib/firestore";
import { Trip } from "../lib/types";

const TripsPage = () => {
  const { user, loading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [createMode, setCreateMode] = useState<"wizard" | "quick">("wizard");
  const [showCreator, setShowCreator] = useState(false);
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

  const handleQuickCreate = async (title: string) => {
    if (!user) {
      return;
    }
    const tripId = await createTrip(title, user);
    navigate(`/trip/${tripId}`);
  };

  const handleWizardCreate = async (values: {
    title: string;
    description?: string;
    destination?: string;
    template?: string;
    startDate?: Date;
    endDate?: Date;
    timezone?: string;
    autoCreateDays: boolean;
  }) => {
    if (!user) {
      return;
    }
    const tripId = await createTripWithDays(
      {
        title: values.title,
        description: values.description,
        destination: values.destination,
        template: values.template,
        startDate: values.startDate,
        endDate: values.endDate,
        timezone: values.timezone
      },
      user,
      values.autoCreateDays
    );
    navigate(`/trip/${tripId}`);
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Your trips</h3>
            <p className="text-sm text-muted-foreground">Create and manage your trip plans.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowCreator((prev) => !prev)}
            aria-label="Create a new trip"
          >
            + New trip
          </Button>
        </div>

        {showCreator ? (
          <div className="mt-6 flex flex-col gap-4">
            <CreateTripModeToggle mode={createMode} onChange={setCreateMode} />
            {createMode === "wizard" ? (
              <CreateTripWizard onCreate={handleWizardCreate} />
            ) : (
              <QuickCreateTrip onCreate={handleQuickCreate} />
            )}
          </div>
        ) : null}

        {error ? <p className="mt-2 text-sm text-muted-foreground">{error}</p> : null}
        <div className="mt-4">
          <TripList trips={trips} />
        </div>
      </Card>
    </div>
  );
};

export default TripsPage;
