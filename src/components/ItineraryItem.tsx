import type { ItineraryItem as ItineraryItemType } from "../lib/types";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

type ItineraryItemProps = {
  item: ItineraryItemType;
};

const formatTime = (date?: Date) => {
  if (!date) {
    return null;
  }
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const ItineraryItem = ({ item }: ItineraryItemProps) => {
  const flightDetails = item.type === "flight" ? item.details : undefined;
  const hotelDetails = item.type === "hotel" ? item.details : undefined;

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-sm font-semibold">{item.title}</strong>
        <Badge variant="secondary">{item.type}</Badge>
        {item.startTime ? <Badge variant="outline">{formatTime(item.startTime)}</Badge> : null}
      </div>
      {item.type === "flight" ? (
        <div className="mt-2 text-sm text-muted-foreground">
          {flightDetails?.flightNumber ? <p>Flight: {flightDetails.flightNumber}</p> : null}
          {flightDetails?.airline ? <p>Airline: {flightDetails.airline}</p> : null}
          {flightDetails?.departure ? (
            <p>
              Depart: {flightDetails.departure.airport} · {formatTime(flightDetails.departure.time)}
            </p>
          ) : null}
          {flightDetails?.arrival ? (
            <p>
              Arrive: {flightDetails.arrival.airport} · {formatTime(flightDetails.arrival.time)}
            </p>
          ) : null}
          {flightDetails?.confirmation ? <p>Confirmation: {flightDetails.confirmation}</p> : null}
        </div>
      ) : null}
      {item.type === "hotel" ? (
        <div className="mt-2 text-sm text-muted-foreground">
          {hotelDetails?.address ? <p>Address: {hotelDetails.address}</p> : null}
          {hotelDetails?.checkIn ? <p>Check-in: {hotelDetails.checkIn.toDateString()}</p> : null}
          {hotelDetails?.checkOut ? <p>Check-out: {hotelDetails.checkOut.toDateString()}</p> : null}
          {hotelDetails?.confirmation ? <p>Confirmation: {hotelDetails.confirmation}</p> : null}
        </div>
      ) : null}
      {item.note ? <p className="mt-2 text-sm text-muted-foreground">{item.note}</p> : null}
    </Card>
  );
};

export default ItineraryItem;
