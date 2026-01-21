import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../lib/auth";
import { ensureMembershipByToken } from "../lib/firestore";

const InvitePage = () => {
  const { token } = useParams();
  const { user, loading, signIn } = useAuth();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    const joinTrip = async () => {
      setStatus("joining");
      try {
        const tripId = await ensureMembershipByToken(token, user);
        if (!tripId) {
          setError("Invite token is invalid or expired.");
          setStatus("error");
          return;
        }
        navigate(`/trip/${tripId}`);
      } catch (joinError) {
        console.error(joinError);
        setError("Unable to join this trip right now.");
        setStatus("error");
      }
    };

    void joinTrip();
  }, [token, user, navigate]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Checking your account...</p>;
  }

  if (!user) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Join this trip</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign in with Google to accept the invite.</p>
        <Button className="mt-4" onClick={signIn}>
          Sign in
        </Button>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Invite error</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold">Joining trip...</h2>
      <p className="mt-2 text-sm text-muted-foreground">We are adding you to the trip now.</p>
    </Card>
  );
};

export default InvitePage;
