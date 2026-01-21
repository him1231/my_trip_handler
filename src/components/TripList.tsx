import { Link } from "react-router-dom";
import { Trip } from "../lib/types";

type TripListProps = {
  trips: Trip[];
};

const TripList = ({ trips }: TripListProps) => {
  if (!trips.length) {
    return <p className="muted">No trips yet. Create one to get started.</p>;
  }

  return (
    <div className="list">
      {trips.map((trip) => (
        <Link key={trip.id} to={`/trip/${trip.id}`} className="card">
          <div className="inline-actions">
            <strong>{trip.title}</strong>
            <span className="badge">{trip.memberIds.length} members</span>
          </div>
          <p className="muted">Invite link stays active until you revoke it.</p>
        </Link>
      ))}
    </div>
  );
};

export default TripList;
