import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
    return <p className="muted">Checking your account...</p>;
  }

  if (!user) {
    return (
      <div className="card">
        <h2>Join this trip</h2>
        <p className="muted">Sign in with Google to accept the invite.</p>
        <button className="primary-button" onClick={signIn}>
          Sign in
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card">
        <h2>Invite error</h2>
        <p className="muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Joining trip...</h2>
      <p className="muted">We are adding you to the trip now.</p>
    </div>
  );
};

export default InvitePage;
