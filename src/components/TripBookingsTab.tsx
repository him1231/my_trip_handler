import { useEffect, useMemo, useState } from "react";
import FlightItemForm from "./FlightItemForm";
import HotelItemForm from "./HotelItemForm";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select";
import { subscribeBookings } from "../lib/firestore";
import { ItineraryItemDetails, TripBooking } from "../lib/types";

type TripBookingsTabProps = {
  tripId: string;
  tripStartDate?: Date;
  canEdit: boolean;
  onAddItem: (payload: {
    title: string;
    type: "flight" | "hotel";
    details: ItineraryItemDetails;
    startTime?: Date;
    date: Date;
  }) => Promise<void>;
  onUpdateItem: (payload: {
    bookingId: string;
    title: string;
    type: "flight" | "hotel";
    details: ItineraryItemDetails;
    startTime?: Date;
    date: Date;
  }) => Promise<void>;
  onDeleteItem: (bookingId: string) => Promise<void>;
};

const TripBookingsTab = ({
  tripId,
  tripStartDate,
  canEdit,
  onAddItem,
  onUpdateItem,
  onDeleteItem
}: TripBookingsTabProps) => {
  const [bookingType, setBookingType] = useState<"flight" | "hotel">("flight");
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; type: "flight" | "hotel" } | null>(null);
  const [flightTitle, setFlightTitle] = useState("");
  const [hotelTitle, setHotelTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [flightDetails, setFlightDetails] = useState({
    flightNumber: "",
    airline: "",
    departureDate: "",
    departureAirport: "",
    departureTime: "",
    arrivalDate: "",
    arrivalAirport: "",
    arrivalTime: "",
    confirmation: "",
    bookingUrl: ""
  });
  const [hotelDetails, setHotelDetails] = useState({
    address: "",
    checkIn: "",
    checkOut: "",
    confirmation: "",
    bookingUrl: ""
  });

  const toDateValue = (value?: unknown): Date | undefined => {
    if (!value) {
      return undefined;
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof (value as { toDate?: () => Date }).toDate === "function") {
      return (value as { toDate: () => Date }).toDate();
    }
    const parsed = new Date(value as string | number);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const formatDateInput = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  };

  const formatTimeInput = (date?: Date) => {
    if (!date) {
      return "";
    }
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  useEffect(() => {
    if (!tripId) {
      return;
    }
    return subscribeBookings(tripId, setBookings);
  }, [tripId]);

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const dateA = a.date?.getTime() ?? 0;
      const dateB = b.date?.getTime() ?? 0;
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      const timeA = a.startTime?.getTime() ?? 0;
      const timeB = b.startTime?.getTime() ?? 0;
      return timeA - timeB;
    });
  }, [bookings]);

  const resolveFlightDate = () => {
    if (flightDetails.departureDate) {
      return new Date(flightDetails.departureDate);
    }
    if (flightDetails.arrivalDate) {
      return new Date(flightDetails.arrivalDate);
    }
    return null;
  };

  const resolveHotelDate = () => {
    if (hotelDetails.checkIn) {
      return new Date(hotelDetails.checkIn);
    }
    if (hotelDetails.checkOut) {
      return new Date(hotelDetails.checkOut);
    }
    return null;
  };

  const handleAddFlight = async () => {
    if (!flightTitle.trim() || !canEdit) {
      return;
    }
    const bookingDate = resolveFlightDate();
    if (!bookingDate) {
      setFormError("Please set a departure or arrival date.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const departureTime = flightDetails.departureTime && flightDetails.departureDate
        ? new Date(`${flightDetails.departureDate}T${flightDetails.departureTime}`)
        : undefined;
      const arrivalTime = flightDetails.arrivalTime && flightDetails.arrivalDate
        ? new Date(`${flightDetails.arrivalDate}T${flightDetails.arrivalTime}`)
        : undefined;

      const details: ItineraryItemDetails = {
        flightNumber: flightDetails.flightNumber || undefined,
        airline: flightDetails.airline || undefined,
        departure: flightDetails.departureAirport
          ? { airport: flightDetails.departureAirport, time: departureTime ?? new Date() }
          : undefined,
        arrival: flightDetails.arrivalAirport
          ? { airport: flightDetails.arrivalAirport, time: arrivalTime ?? new Date() }
          : undefined,
        confirmation: flightDetails.confirmation || undefined,
        bookingUrl: flightDetails.bookingUrl || undefined
      };

      await onAddItem({
        title: flightTitle.trim(),
        type: "flight",
        details,
        startTime: departureTime,
        date: bookingDate
      });

      setIsAdding(false);
      setFlightTitle("");
      setFlightDetails({
        flightNumber: "",
        airline: "",
        departureDate: "",
        departureAirport: "",
        departureTime: "",
        arrivalDate: "",
        arrivalAirport: "",
        arrivalTime: "",
        confirmation: "",
        bookingUrl: ""
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddHotel = async () => {
    if (!hotelTitle.trim() || !canEdit) {
      return;
    }
    const bookingDate = resolveHotelDate();
    if (!bookingDate) {
      setFormError("Please set a check-in or check-out date.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const details: ItineraryItemDetails = {
        address: hotelDetails.address || undefined,
        checkIn: hotelDetails.checkIn ? new Date(hotelDetails.checkIn) : undefined,
        checkOut: hotelDetails.checkOut ? new Date(hotelDetails.checkOut) : undefined,
        confirmation: hotelDetails.confirmation || undefined,
        bookingUrl: hotelDetails.bookingUrl || undefined
      };

      const startTime = details.checkIn ?? details.checkOut ?? bookingDate;

      await onAddItem({
        title: hotelTitle.trim(),
        type: "hotel",
        details,
        startTime,
        date: bookingDate
      });

      setIsAdding(false);
      setHotelTitle("");
      setHotelDetails({
        address: "",
        checkIn: "",
        checkOut: "",
        confirmation: "",
        bookingUrl: ""
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFlight = async () => {
    if (!editingItem || !flightTitle.trim() || !canEdit) {
      return;
    }
    const bookingDate = resolveFlightDate();
    if (!bookingDate) {
      setFormError("Please set a departure or arrival date.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const departureTime = flightDetails.departureTime && flightDetails.departureDate
        ? new Date(`${flightDetails.departureDate}T${flightDetails.departureTime}`)
        : undefined;
      const arrivalTime = flightDetails.arrivalTime && flightDetails.arrivalDate
        ? new Date(`${flightDetails.arrivalDate}T${flightDetails.arrivalTime}`)
        : undefined;

      const details: ItineraryItemDetails = {
        flightNumber: flightDetails.flightNumber || undefined,
        airline: flightDetails.airline || undefined,
        departure: flightDetails.departureAirport
          ? { airport: flightDetails.departureAirport, time: departureTime ?? new Date() }
          : undefined,
        arrival: flightDetails.arrivalAirport
          ? { airport: flightDetails.arrivalAirport, time: arrivalTime ?? new Date() }
          : undefined,
        confirmation: flightDetails.confirmation || undefined,
        bookingUrl: flightDetails.bookingUrl || undefined
      };

      await onUpdateItem({
        bookingId: editingItem.id,
        title: flightTitle.trim(),
        type: "flight",
        details,
        startTime: departureTime,
        date: bookingDate
      });

      setEditingItem(null);
      setIsAdding(false);
      setFlightTitle("");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateHotel = async () => {
    if (!editingItem || !hotelTitle.trim() || !canEdit) {
      return;
    }
    const bookingDate = resolveHotelDate();
    if (!bookingDate) {
      setFormError("Please set a check-in or check-out date.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const details: ItineraryItemDetails = {
        address: hotelDetails.address || undefined,
        checkIn: hotelDetails.checkIn ? new Date(hotelDetails.checkIn) : undefined,
        checkOut: hotelDetails.checkOut ? new Date(hotelDetails.checkOut) : undefined,
        confirmation: hotelDetails.confirmation || undefined,
        bookingUrl: hotelDetails.bookingUrl || undefined
      };

      const startTime = details.checkIn ?? details.checkOut ?? bookingDate;

      await onUpdateItem({
        bookingId: editingItem.id,
        title: hotelTitle.trim(),
        type: "hotel",
        details,
        startTime,
        date: bookingDate
      });

      setEditingItem(null);
      setIsAdding(false);
      setHotelTitle("");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (item: TripBooking) => {
    setFormError(null);
    setIsAdding(true);
    setEditingItem({ id: item.id, type: item.type as "flight" | "hotel" });
    setBookingType(item.type as "flight" | "hotel");

    if (item.type === "flight") {
      const departureTime = toDateValue(item.details?.departure?.time);
      const arrivalTime = toDateValue(item.details?.arrival?.time);
      const bookingDate = toDateValue(item.date);
      setFlightTitle(item.title ?? "");
      setFlightDetails({
        flightNumber: item.details?.flightNumber ?? "",
        airline: item.details?.airline ?? "",
        departureDate: departureTime
          ? formatDateInput(departureTime)
          : bookingDate
            ? formatDateInput(bookingDate)
            : "",
        departureAirport: item.details?.departure?.airport ?? "",
        departureTime: formatTimeInput(departureTime),
        arrivalDate: arrivalTime
          ? formatDateInput(arrivalTime)
          : bookingDate
            ? formatDateInput(bookingDate)
            : "",
        arrivalAirport: item.details?.arrival?.airport ?? "",
        arrivalTime: formatTimeInput(arrivalTime),
        confirmation: item.details?.confirmation ?? "",
        bookingUrl: item.details?.bookingUrl ?? ""
      });
    } else {
      setHotelTitle(item.title ?? "");
      setHotelDetails({
        address: item.details?.address ?? "",
        checkIn: toDateValue(item.details?.checkIn)
          ? formatDateInput(toDateValue(item.details?.checkIn) as Date)
          : toDateValue(item.date)
            ? formatDateInput(toDateValue(item.date) as Date)
            : "",
        checkOut: toDateValue(item.details?.checkOut)
          ? formatDateInput(toDateValue(item.details?.checkOut) as Date)
          : toDateValue(item.date)
            ? formatDateInput(toDateValue(item.date) as Date)
            : "",
        confirmation: item.details?.confirmation ?? "",
        bookingUrl: item.details?.bookingUrl ?? ""
      });
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Bookings</h3>
          <p className="text-sm text-muted-foreground">Your saved flight and hotel bookings.</p>
        </div>
        {canEdit ? (
          <Button variant="outline" onClick={() => setIsAdding((prev) => !prev)}>
            {isAdding ? "Close" : "Add booking"}
          </Button>
        ) : null}
      </div>

      {!isAdding ? (
        <div className="mt-4 flex flex-col gap-6">
          {sortedBookings.length ? (
            <>
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Flights</h4>
                {sortedBookings.filter((item) => item.type === "flight").length ? (
                  sortedBookings
                    .filter((item) => item.type === "flight")
                    .map((item) => {
                      const dateLabel = item.date ? item.date.toLocaleDateString() : "";
                      return (
                        <Card key={item.id} className="p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="text-base font-semibold">{item.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                Flight{dateLabel ? ` · ${dateLabel}` : ""}
                              </p>
                            </div>
                            {canEdit ? (
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => startEditing(item)}>
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => onDeleteItem(item.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </Card>
                      );
                    })
                ) : (
                  <p className="text-sm text-muted-foreground">No flights yet.</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Hotels</h4>
                {sortedBookings.filter((item) => item.type === "hotel").length ? (
                  sortedBookings
                    .filter((item) => item.type === "hotel")
                    .map((item) => {
                      const dateLabel = item.date ? item.date.toLocaleDateString() : "";
                      return (
                        <Card key={item.id} className="p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="text-base font-semibold">{item.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                Hotel{dateLabel ? ` · ${dateLabel}` : ""}
                              </p>
                            </div>
                            {canEdit ? (
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => startEditing(item)}>
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => onDeleteItem(item.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </Card>
                      );
                    })
                ) : (
                  <p className="text-sm text-muted-foreground">No hotels yet.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No bookings yet. Add your first one.</p>
          )}
        </div>
      ) : null}

      {isAdding ? (
        <div className="mt-6 flex flex-col gap-4 border-t pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={bookingType} onValueChange={(value) => setBookingType(value as "flight" | "hotel")}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select booking type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flight">Flight</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Pick the date directly in the form.</p>
          </div>

          {bookingType === "flight" ? (
            <>
              <Input
                placeholder="Flight title (e.g. ICN → JFK)"
                value={flightTitle}
                onChange={(event) => setFlightTitle(event.target.value)}
              />
              <FlightItemForm
                {...flightDetails}
                onChange={(field, value) =>
                  setFlightDetails((prev) => ({
                    ...prev,
                    [field]: value
                  }))
                }
              />
            </>
          ) : (
            <>
              <Input
                placeholder="Hotel name"
                value={hotelTitle}
                onChange={(event) => setHotelTitle(event.target.value)}
              />
              <HotelItemForm
                {...hotelDetails}
                tripStartDate={tripStartDate}
                onChange={(field, value) =>
                  setHotelDetails((prev) => ({
                    ...prev,
                    [field]: value
                  }))
                }
              />
            </>
          )}

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={
                bookingType === "flight"
                  ? editingItem
                    ? handleUpdateFlight
                    : handleAddFlight
                  : editingItem
                    ? handleUpdateHotel
                    : handleAddHotel
              }
              disabled={
                !canEdit ||
                saving ||
                (bookingType === "flight" ? !flightTitle.trim() : !hotelTitle.trim())
              }
            >
              {editingItem ? "Update booking" : "Add booking"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsAdding(false);
                setEditingItem(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
};

export default TripBookingsTab;
