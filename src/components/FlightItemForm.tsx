import { Input } from "./ui/input";
import { Label } from "./ui/label";

type FlightItemFormProps = {
  flightNumber: string;
  airline: string;
  departureDate: string;
  departureAirport: string;
  departureTime: string;
  arrivalDate: string;
  arrivalAirport: string;
  arrivalTime: string;
  confirmation: string;
  bookingUrl: string;
  onChange: (field: string, value: string) => void;
};

const FlightItemForm = ({
  flightNumber,
  airline,
  departureDate,
  departureAirport,
  departureTime,
  arrivalDate,
  arrivalAirport,
  arrivalTime,
  confirmation,
  bookingUrl,
  onChange
}: FlightItemFormProps) => {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <Label>Flight number</Label>
        <Input value={flightNumber} onChange={(e) => onChange("flightNumber", e.target.value)} />
      </div>
      <div>
        <Label>Airline</Label>
        <Input value={airline} onChange={(e) => onChange("airline", e.target.value)} />
      </div>
      <div>
        <Label>Departure date</Label>
        <Input type="date" value={departureDate} onChange={(e) => onChange("departureDate", e.target.value)} />
      </div>
      <div>
        <Label>Departure airport</Label>
        <Input value={departureAirport} onChange={(e) => onChange("departureAirport", e.target.value)} />
      </div>
      <div>
        <Label>Departure time</Label>
        <Input type="time" value={departureTime} onChange={(e) => onChange("departureTime", e.target.value)} />
      </div>
      <div>
        <Label>Arrival date</Label>
        <Input type="date" value={arrivalDate} onChange={(e) => onChange("arrivalDate", e.target.value)} />
      </div>
      <div>
        <Label>Arrival airport</Label>
        <Input value={arrivalAirport} onChange={(e) => onChange("arrivalAirport", e.target.value)} />
      </div>
      <div>
        <Label>Arrival time</Label>
        <Input type="time" value={arrivalTime} onChange={(e) => onChange("arrivalTime", e.target.value)} />
      </div>
      <div>
        <Label>Confirmation</Label>
        <Input value={confirmation} onChange={(e) => onChange("confirmation", e.target.value)} />
      </div>
      <div>
        <Label>Booking URL</Label>
        <Input value={bookingUrl} onChange={(e) => onChange("bookingUrl", e.target.value)} />
      </div>
    </div>
  );
};

export default FlightItemForm;
