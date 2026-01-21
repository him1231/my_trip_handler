import { Input } from "./ui/input";
import { Label } from "./ui/label";

type HotelItemFormProps = {
  address: string;
  checkIn: string;
  checkOut: string;
  confirmation: string;
  bookingUrl: string;
  onChange: (field: string, value: string) => void;
};

const HotelItemForm = ({
  address,
  checkIn,
  checkOut,
  confirmation,
  bookingUrl,
  onChange
}: HotelItemFormProps) => {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label>Address</Label>
        <Input value={address} onChange={(e) => onChange("address", e.target.value)} />
      </div>
      <div>
        <Label>Check-in date</Label>
        <Input type="date" value={checkIn} onChange={(e) => onChange("checkIn", e.target.value)} />
      </div>
      <div>
        <Label>Check-out date</Label>
        <Input type="date" value={checkOut} onChange={(e) => onChange("checkOut", e.target.value)} />
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

export default HotelItemForm;
