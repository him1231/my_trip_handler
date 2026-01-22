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
import { getHkiaCacheEntry, pruneHkiaCache, setHkiaCacheEntry, subscribeBookings } from "../lib/firestore";
import { extractMatchFromResponse, fetchPastFlights } from "../lib/hkiaFlightInfo";
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
  const [flightAutoInfo, setFlightAutoInfo] = useState<{
    departureAirport?: string;
    arrivalAirport?: string;
    departureTime?: Date;
    arrivalTime?: Date;
  } | null>(null);
  const [showFlightDetails, setShowFlightDetails] = useState(false);
  const [checkingFlight, setCheckingFlight] = useState(false);
  const [hotelDetails, setHotelDetails] = useState({
    address: "",
    checkIn: "",
    checkOut: "",
    confirmation: "",
    bookingUrl: ""
  });

  const resetFlightForm = () => {
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
    setFlightAutoInfo(null);
    setShowFlightDetails(false);
    setFormError(null);
  };

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

  const parseTime = (date: string, time?: string) => {
    if (!time) {
      return undefined;
    }
    const match = String(time).match(/(\d{1,2}):?(\d{2})/);
    if (!match) {
      return undefined;
    }
    const hours = match[1].padStart(2, "0");
    const minutes = match[2];
    const parsed = new Date(`${date}T${hours}:${minutes}`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const formatApiDate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (!tripId) {
      return;
    }
    return subscribeBookings(tripId, setBookings);
  }, [tripId]);

  const handleCheckFlight = async () => {
    const airline = flightDetails.airline.trim();
    const flightNumber = flightDetails.flightNumber.trim();
    const date = flightDetails.departureDate;
    if (!airline || !flightNumber) {
      window.alert("Please fill airline and flight number first.");
      return;
    }

    if (date) {
      const selectedDate = new Date(date);
      if (Number.isNaN(selectedDate.getTime())) {
        window.alert("Please provide a valid departure date.");
        return;
      }
    }

    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);

    setCheckingFlight(true);
    try {
      let departureMatch = null;
      let arrivalMatch = null;
      let matchedDate: string | null = null;
      let wroteCache = false;

      const getCachedOrFetch = async (apiDate: string, arrival: boolean) => {
        const cached = await getHkiaCacheEntry({
          date: apiDate,
          arrival,
          cargo: false,
          lang: "en"
        });
        if (cached) {
          return cached;
        }
        const response = await fetchPastFlights({
          date: apiDate,
          arrival,
          cargo: false,
          lang: "en"
        });
        await setHkiaCacheEntry(
          {
            date: apiDate,
            arrival,
            cargo: false,
            lang: "en"
          },
          response
        );
        wroteCache = true;
        return response;
      };

      for (let offset = 0; offset < 7; offset += 1) {
        const candidate = new Date(yesterday);
        candidate.setDate(yesterday.getDate() - offset);
        const apiDate = formatApiDate(candidate);

        const [depResponse, arrResponse] = await Promise.all([
          getCachedOrFetch(apiDate, false).catch(() => null),
          getCachedOrFetch(apiDate, true).catch(() => null)
        ]);

        const dep = depResponse ? extractMatchFromResponse(depResponse, airline, flightNumber) : null;
        const arr = arrResponse ? extractMatchFromResponse(arrResponse, airline, flightNumber) : null;

        if (dep || arr) {
          departureMatch = dep;
          arrivalMatch = arr;
          matchedDate = apiDate;
          break;
        }
      }

      if (wroteCache) {
        await pruneHkiaCache();
      }

      const auto: {
        departureAirport?: string;
        arrivalAirport?: string;
        departureTime?: Date;
        arrivalTime?: Date;
      } = {};

      const timeBase = date || matchedDate || formatApiDate(yesterday);

      if (departureMatch) {
        auto.departureAirport = "HKG";
        auto.arrivalAirport = departureMatch.destination;
        auto.departureTime = parseTime(timeBase, departureMatch.time);
      }

      if (arrivalMatch) {
        auto.departureAirport = arrivalMatch.origin ?? auto.departureAirport;
        auto.arrivalAirport = "HKG";
        auto.arrivalTime = parseTime(timeBase, arrivalMatch.time);
      }

      const hasMatch = Object.keys(auto).length > 0;
      setFlightAutoInfo(hasMatch ? auto : null);
      setShowFlightDetails(true);

      if (!hasMatch) {
        window.alert("No similar flight found in the last 7 days. Please fill the remaining details manually.");
      }

      if (hasMatch) {
        setFlightDetails((prev) => ({
          ...prev,
          departureAirport: auto.departureAirport ?? prev.departureAirport,
          arrivalAirport: auto.arrivalAirport ?? prev.arrivalAirport,
          departureTime: auto.departureTime ? formatTimeInput(auto.departureTime) : prev.departureTime,
          arrivalTime: auto.arrivalTime ? formatTimeInput(auto.arrivalTime) : prev.arrivalTime,
          arrivalDate: auto.arrivalTime ? timeBase : prev.arrivalDate
        }));
      }
      return hasMatch;
    } catch (error) {
      console.error("HKIA check failed", error);
      return false;
    } finally {
      setCheckingFlight(false);
    }
  };

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

  const buildFlightTitle = (details: {
    airline?: string;
    flightNumber?: string;
    departureAirport?: string;
    arrivalAirport?: string;
  }) => {
    const airlineCode = details.airline?.trim().toUpperCase() ?? "";
    const number = details.flightNumber?.trim() ?? "";
    const flightCode = `${airlineCode}${number}`.trim();
    const route = details.departureAirport && details.arrivalAirport
      ? `${details.departureAirport} → ${details.arrivalAirport}`
      : "";
    if (flightCode && route) {
      return `${flightCode} · ${route}`;
    }
    return flightCode || route || "Flight";
  };

  const handleAddFlight = async () => {
    if (!canEdit) {
      return;
    }
    const bookingDate = resolveFlightDate();
    if (!bookingDate) {
      setFormError("Please set a departure date.");
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
        departure: flightAutoInfo?.departureAirport
          ? { airport: flightAutoInfo.departureAirport, time: flightAutoInfo.departureTime ?? bookingDate }
          : undefined,
        arrival: flightAutoInfo?.arrivalAirport
          ? { airport: flightAutoInfo.arrivalAirport, time: flightAutoInfo.arrivalTime ?? bookingDate }
          : undefined
      };

      if (!details.departure && flightDetails.departureAirport) {
        details.departure = {
          airport: flightDetails.departureAirport,
          time: departureTime ?? bookingDate
        };
      }
      if (!details.arrival && flightDetails.arrivalAirport) {
        details.arrival = {
          airport: flightDetails.arrivalAirport,
          time: arrivalTime ?? bookingDate
        };
      }
      if (flightDetails.confirmation) {
        details.confirmation = flightDetails.confirmation;
      }
      if (flightDetails.bookingUrl) {
        details.bookingUrl = flightDetails.bookingUrl;
      }

      await onAddItem({
        title: buildFlightTitle({
          airline: flightDetails.airline,
          flightNumber: flightDetails.flightNumber,
          departureAirport: details.departure?.airport,
          arrivalAirport: details.arrival?.airport
        }),
        type: "flight",
        details,
        startTime: flightAutoInfo?.departureTime ?? bookingDate,
        date: bookingDate
      });

      setIsAdding(false);
      resetFlightForm();
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
    if (!editingItem || !canEdit) {
      return;
    }
    const bookingDate = resolveFlightDate();
    if (!bookingDate) {
      setFormError("Please set a departure date.");
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
        departure: flightAutoInfo?.departureAirport
          ? { airport: flightAutoInfo.departureAirport, time: flightAutoInfo.departureTime ?? bookingDate }
          : undefined,
        arrival: flightAutoInfo?.arrivalAirport
          ? { airport: flightAutoInfo.arrivalAirport, time: flightAutoInfo.arrivalTime ?? bookingDate }
          : undefined
      };

      if (!details.departure && flightDetails.departureAirport) {
        details.departure = {
          airport: flightDetails.departureAirport,
          time: departureTime ?? bookingDate
        };
      }
      if (!details.arrival && flightDetails.arrivalAirport) {
        details.arrival = {
          airport: flightDetails.arrivalAirport,
          time: arrivalTime ?? bookingDate
        };
      }
      if (flightDetails.confirmation) {
        details.confirmation = flightDetails.confirmation;
      }
      if (flightDetails.bookingUrl) {
        details.bookingUrl = flightDetails.bookingUrl;
      }

      await onUpdateItem({
        bookingId: editingItem.id,
        title: buildFlightTitle({
          airline: flightDetails.airline,
          flightNumber: flightDetails.flightNumber,
          departureAirport: details.departure?.airport,
          arrivalAirport: details.arrival?.airport
        }),
        type: "flight",
        details,
        startTime: flightAutoInfo?.departureTime ?? bookingDate,
        date: bookingDate
      });

      setEditingItem(null);
      setIsAdding(false);
      resetFlightForm();
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
      const bookingDate = toDateValue(item.date);
      setFlightAutoInfo({
        departureAirport: item.details?.departure?.airport,
        arrivalAirport: item.details?.arrival?.airport,
        departureTime: toDateValue(item.details?.departure?.time),
        arrivalTime: toDateValue(item.details?.arrival?.time)
      });
      setShowFlightDetails(true);
      setFlightDetails({
        flightNumber: item.details?.flightNumber ?? "",
        airline: item.details?.airline ?? "",
        departureDate: bookingDate ? formatDateInput(bookingDate) : "",
        departureAirport: item.details?.departure?.airport ?? "",
        departureTime: toDateValue(item.details?.departure?.time)
          ? formatTimeInput(toDateValue(item.details?.departure?.time))
          : "",
        arrivalDate: toDateValue(item.details?.arrival?.time)
          ? formatDateInput(toDateValue(item.details?.arrival?.time) as Date)
          : bookingDate
            ? formatDateInput(bookingDate)
            : "",
        arrivalAirport: item.details?.arrival?.airport ?? "",
        arrivalTime: toDateValue(item.details?.arrival?.time)
          ? formatTimeInput(toDateValue(item.details?.arrival?.time))
          : "",
        confirmation: item.details?.confirmation ?? "",
        bookingUrl: item.details?.bookingUrl ?? ""
      });
    } else {
      setHotelTitle(item.title ?? "");
      setFlightAutoInfo(null);
      setShowFlightDetails(false);
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
          <Button
            variant="outline"
            onClick={() => {
              setIsAdding((prev) => {
                if (prev) {
                  resetFlightForm();
                }
                return !prev;
              });
            }}
          >
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
            <Select
              value={bookingType}
              onValueChange={(value) => {
                const nextType = value as "flight" | "hotel";
                setBookingType(nextType);
                if (nextType === "hotel") {
                  resetFlightForm();
                }
              }}
            >
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
              <FlightItemForm
                {...flightDetails}
                showAdvanced={showFlightDetails}
                onChange={(field, value) =>
                  setFlightDetails((prev) => ({
                    ...prev,
                    [field]: value
                  }))
                }
              />
              {!flightAutoInfo ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCheckFlight}
                    disabled={checkingFlight || !flightDetails.airline || !flightDetails.flightNumber}
                  >
                    {checkingFlight ? "Checking..." : "Check flight"}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Check flight to auto-fill flight details.
                  </p>
                </div>
              ) : null}
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
            {bookingType !== "flight" || showFlightDetails ? (
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
                  (bookingType === "flight" ? false : !hotelTitle.trim())
                }
              >
                {editingItem ? "Update booking" : "Add booking"}
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                setIsAdding(false);
                setEditingItem(null);
                resetFlightForm();
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
