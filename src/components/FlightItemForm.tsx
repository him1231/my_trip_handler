import AirlineSelect from "./AirlineSelect";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type FlightItemFormProps = {
  flightNumber: string;
  airline: string;
  departureDate: string;
  departureAirport?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalAirport?: string;
  arrivalTime?: string;
  confirmation?: string;
  bookingUrl?: string;
  showAdvanced?: boolean;
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
  showAdvanced = false,
  onChange
}: FlightItemFormProps) => {
  return (
    <div className="flex flex-col gap-3">
      <div className={showAdvanced ? "grid grid-cols-1 gap-3 md:grid-cols-2" : "flex flex-col gap-3"}>
        <div>
        <Label>Airline</Label>
        <AirlineSelect value={airline} onChange={(value) => onChange("airline", value)} />
        </div>
        <div>
        <Label>Flight number</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {airline ? airline.toUpperCase() : "--"}
          </span>
          <Input
            className="pl-12"
            placeholder="XXX"
            value={flightNumber}
            onChange={(e) => onChange("flightNumber", e.target.value)}
          />
        </div>
        </div>
        <div>
        <Label>Departure date</Label>
        <Input type="date" value={departureDate} onChange={(e) => onChange("departureDate", e.target.value)} />
        </div>
        {showAdvanced ? (
          <>
            <div>
              <Label>Departure airport</Label>
              <Input value={departureAirport ?? ""} onChange={(e) => onChange("departureAirport", e.target.value)} />
            </div>
            <div>
              <Label>Departure time</Label>
              <Input type="time" value={departureTime ?? ""} onChange={(e) => onChange("departureTime", e.target.value)} />
            </div>
            <div>
              <Label>Arrival date</Label>
              <Input type="date" value={arrivalDate ?? ""} onChange={(e) => onChange("arrivalDate", e.target.value)} />
            </div>
            <div>
              <Label>Arrival airport</Label>
              <Input value={arrivalAirport ?? ""} onChange={(e) => onChange("arrivalAirport", e.target.value)} />
            </div>
            <div>
              <Label>Arrival time</Label>
              <Input type="time" value={arrivalTime ?? ""} onChange={(e) => onChange("arrivalTime", e.target.value)} />
            </div>
            <div>
              <Label>Confirmation</Label>
              <Input value={confirmation ?? ""} onChange={(e) => onChange("confirmation", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Booking URL</Label>
              <Input value={bookingUrl ?? ""} onChange={(e) => onChange("bookingUrl", e.target.value)} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default FlightItemForm;
