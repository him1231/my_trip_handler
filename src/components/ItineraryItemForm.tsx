import { useState } from "react";
import { ItineraryItemDetails, ItineraryItemType } from "../lib/types";
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
import { Textarea } from "./ui/textarea";

type ItineraryItemFormProps = {
  dayDate: Date;
  canEdit: boolean;
  onSave: (payload: {
    type: ItineraryItemType;
    title: string;
    note?: string;
    startTime?: Date;
    details?: ItineraryItemDetails;
  }) => void;
};

const ItineraryItemForm = ({ dayDate, canEdit, onSave }: ItineraryItemFormProps) => {
  const [type, setType] = useState<ItineraryItemType>("activity");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [time, setTime] = useState("");
  const [flightDetails, setFlightDetails] = useState({
    flightNumber: "",
    airline: "",
    departureAirport: "",
    departureTime: "",
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

  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }

    let startTime: Date | undefined;
    if (time) {
      const [hours, minutes] = time.split(":").map((value) => Number(value));
      startTime = new Date(dayDate);
      startTime.setHours(hours);
      startTime.setMinutes(minutes);
      startTime.setSeconds(0);
      startTime.setMilliseconds(0);
    }

    let details: ItineraryItemDetails | undefined;
    if (type === "flight") {
      const departureTime = flightDetails.departureTime
        ? new Date(`${dayDate.toISOString().slice(0, 10)}T${flightDetails.departureTime}`)
        : undefined;
      const arrivalTime = flightDetails.arrivalTime
        ? new Date(`${dayDate.toISOString().slice(0, 10)}T${flightDetails.arrivalTime}`)
        : undefined;
      details = {
        flightNumber: flightDetails.flightNumber || undefined,
        airline: flightDetails.airline || undefined,
        departure: flightDetails.departureAirport
          ? { airport: flightDetails.departureAirport, time: departureTime ?? new Date(dayDate) }
          : undefined,
        arrival: flightDetails.arrivalAirport
          ? { airport: flightDetails.arrivalAirport, time: arrivalTime ?? new Date(dayDate) }
          : undefined,
        confirmation: flightDetails.confirmation || undefined,
        bookingUrl: flightDetails.bookingUrl || undefined
      };
    }
    if (type === "hotel") {
      const checkIn = hotelDetails.checkIn ? new Date(hotelDetails.checkIn) : undefined;
      const checkOut = hotelDetails.checkOut ? new Date(hotelDetails.checkOut) : undefined;
      details = {
        address: hotelDetails.address || undefined,
        checkIn,
        checkOut,
        confirmation: hotelDetails.confirmation || undefined,
        bookingUrl: hotelDetails.bookingUrl || undefined
      };
    }

    onSave({
      type,
      title: title.trim(),
      note: note.trim() || undefined,
      startTime,
      details
    });

    setTitle("");
    setNote("");
    setTime("");
    setFlightDetails({
      flightNumber: "",
      airline: "",
      departureAirport: "",
      departureTime: "",
      arrivalAirport: "",
      arrivalTime: "",
      confirmation: "",
      bookingUrl: ""
    });
    setHotelDetails({
      address: "",
      checkIn: "",
      checkOut: "",
      confirmation: "",
      bookingUrl: ""
    });
  };

  return (
    <Card className="bg-slate-50 p-4">
      <h4 className="text-base font-semibold">Add itinerary item</h4>
      <div className="mt-4 flex flex-col gap-3">
        <Select value={type} onValueChange={(value) => setType(value as ItineraryItemType)}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flight">Flight</SelectItem>
            <SelectItem value="hotel">Hotel</SelectItem>
            <SelectItem value="activity">Activity</SelectItem>
            <SelectItem value="restaurant">Restaurant</SelectItem>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        {type === "flight" ? (
          <FlightItemForm
            {...flightDetails}
            onChange={(field, value) =>
              setFlightDetails((prev) => ({
                ...prev,
                [field]: value
              }))
            }
          />
        ) : null}
        {type === "hotel" ? (
          <HotelItemForm
            {...hotelDetails}
            onChange={(field, value) =>
              setHotelDetails((prev) => ({
                ...prev,
                [field]: value
              }))
            }
          />
        ) : null}
        <Textarea
          placeholder="Optional notes"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button onClick={handleSubmit} disabled={!canEdit}>
          Add item
        </Button>
      </div>
    </Card>
  );
};

export default ItineraryItemForm;
