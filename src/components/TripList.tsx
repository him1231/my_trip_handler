import { Link } from "react-router-dom";
import { Trip } from "../lib/types";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

type TripListProps = {
  trips: Trip[];
};

const TripList = ({ trips }: TripListProps) => {
  if (!trips.length) {
    return <p className="text-sm text-muted-foreground">No trips yet. Create one to get started.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {trips.map((trip) => (
        <Link key={trip.id} to={`/trip/${trip.id}`}>
          <Card className="p-5 transition hover:shadow-lg">
            <div className="flex flex-wrap items-center gap-3">
              <strong className="text-base font-semibold">{trip.title}</strong>
              <Badge variant="secondary">{trip.memberIds.length} members</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Invite link stays active until you revoke it.
            </p>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default TripList;
