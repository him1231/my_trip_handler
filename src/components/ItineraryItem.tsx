import type { ChecklistItem, ItineraryItem as ItineraryItemType, TimelineEntry } from "../lib/types";
import {
  ClipboardList,
  GripVertical,
  Hotel,
  MapPin,
  Pencil,
  Plane,
  StickyNote,
  TrainFront,
  Utensils
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";

type ItineraryItemProps = {
  entry: TimelineEntry;
  onSelectBooking?: (bookingId: string) => void;
  onSelectItem?: (item: ItineraryItemType) => void;
  onToggleChecklist?: (itemId: string, items: ChecklistItem[]) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

const formatTime = (value?: Date | string | number) => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const getIcon = (type: string) => {
  switch (type) {
    case "flight":
      return Plane;
    case "hotel":
      return Hotel;
    case "restaurant":
      return Utensils;
    case "activity":
      return MapPin;
    case "note":
      return StickyNote;
    case "transport":
      return TrainFront;
    case "checklist":
      return ClipboardList;
    default:
      return MapPin;
  }
};

const ItineraryItem = ({
  entry,
  onSelectBooking,
  onSelectItem,
  onToggleChecklist,
  dragHandleProps
}: ItineraryItemProps) => {
  if (entry.kind === "day") {
    return (
      <div className="flex flex-col gap-2">
        <Separator />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            Day {entry.day.dayNumber}
          </span>
          <span className="text-sm text-muted-foreground">· {entry.day.date.toLocaleDateString()}</span>
        </div>
        {entry.day.note ? <p className="text-sm text-muted-foreground">{entry.day.note}</p> : null}
        <Separator />
      </div>
    );
  }

  if (entry.kind === "group") {
    return (
      <div className="flex flex-col gap-2">
        <Separator />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{entry.group.title}</span>
          {entry.group.isDefault ? (
            <Badge variant="outline">default</Badge>
          ) : null}
        </div>
        <Separator />
      </div>
    );
  }

  const isBooking = entry.kind === "booking";
  const item = entry.kind === "itinerary" ? entry.item : null;
  const booking = entry.kind === "booking" ? entry.booking : null;
  const type = item?.type ?? booking?.type ?? "activity";
  const Icon = getIcon(type);

  const flightDetails = type === "flight" ? (item?.details ?? booking?.details) : undefined;
  const hotelDetails = type === "hotel" ? (item?.details ?? booking?.details) : undefined;
  const checklistItems = item?.details?.checklistItems ?? [];

  const handleToggle = (id: string) => {
    if (!item || !onToggleChecklist) {
      return;
    }
    const nextItems = checklistItems.map((entryItem) =>
      entryItem.id === id ? { ...entryItem, done: !entryItem.done } : entryItem
    );
    onToggleChecklist(item.id, nextItems);
  };

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4" />
          {item?.title ?? booking?.title}
        </span>
        <Badge variant="secondary">{type}</Badge>
        {isBooking ? <Badge variant="outline">booking</Badge> : null}
        {item?.startTime || booking?.startTime ? (
          <Badge variant="outline">{formatTime(item?.startTime ?? booking?.startTime)}</Badge>
        ) : null}
        {(isBooking && booking && onSelectBooking) || (item && onSelectItem) || dragHandleProps ? (
          <div className="ml-auto flex items-center gap-2">
            {isBooking && booking && onSelectBooking ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onSelectBooking(booking.id)}
                aria-label="Edit booking"
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}
            {item && onSelectItem ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onSelectItem(item)}
                aria-label="Edit item"
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}
            {dragHandleProps ? (
              <button
                type="button"
                className="text-muted-foreground"
                {...dragHandleProps}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {type === "flight" ? (
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
      {type === "hotel" ? (
        <div className="mt-2 text-sm text-muted-foreground">
          {hotelDetails?.address ? <p>Address: {hotelDetails.address}</p> : null}
          {hotelDetails?.checkIn ? <p>Check-in: {hotelDetails.checkIn.toDateString()}</p> : null}
          {hotelDetails?.checkOut ? <p>Check-out: {hotelDetails.checkOut.toDateString()}</p> : null}
          {hotelDetails?.confirmation ? <p>Confirmation: {hotelDetails.confirmation}</p> : null}
        </div>
      ) : null}
      {item?.note ? <p className="mt-2 text-sm text-muted-foreground">{item.note}</p> : null}
      {item?.type === "checklist" && checklistItems.length ? (
        <div className="mt-3 flex flex-col gap-2">
          {checklistItems.map((entryItem) => (
            <label key={entryItem.id} className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={entryItem.done}
                onChange={() => handleToggle(entryItem.id)}
              />
              <span className={entryItem.done ? "line-through" : ""}>{entryItem.title}</span>
            </label>
          ))}
        </div>
      ) : null}
    </Card>
  );
};

export default ItineraryItem;
