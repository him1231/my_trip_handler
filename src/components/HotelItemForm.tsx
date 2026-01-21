import DateRangePicker from "./DateRangePicker";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type HotelItemFormProps = {
  address: string;
  checkIn: string;
  checkOut: string;
  confirmation: string;
  bookingUrl: string;
  onChange: (field: string, value: string) => void;
  tripStartDate?: Date;
};

const HotelItemForm = ({
  address,
  checkIn,
  checkOut,
  confirmation,
  bookingUrl,
  onChange,
  tripStartDate
}: HotelItemFormProps) => {
  const formatInputDate = (date?: Date) => {
    if (!date) {
      return "";
    }
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  };

  const checkInDate = checkIn ? new Date(checkIn) : undefined;
  const checkOutDate = checkOut ? new Date(checkOut) : undefined;
  const defaultMonth = checkInDate ?? checkOutDate ?? tripStartDate;

  const handleRangeChange = (range?: { from?: Date; to?: Date }) => {
    if (!range?.from) {
      onChange("checkIn", "");
      onChange("checkOut", "");
      return;
    }

    onChange("checkIn", formatInputDate(range.from));
    onChange("checkOut", range.to ? formatInputDate(range.to) : "");
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label>Address</Label>
        <Input value={address} onChange={(e) => onChange("address", e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <DateRangePicker
          label="Stay dates"
          description="Select check-in and check-out dates."
          startDate={checkInDate}
          endDate={checkOutDate}
          onChange={handleRangeChange}
          defaultMonth={defaultMonth}
        />
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
