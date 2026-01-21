import { useMemo, useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "./ui/dialog";
import { cn } from "../lib/utils";

type DateRangePickerProps = {
  label?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  onChange: (range: DateRange | undefined) => void;
  defaultMonth?: Date;
  disabled?: boolean;
};

const formatLabel = (date?: Date) =>
  date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

const DateRangePicker = ({
  label = "Dates",
  description,
  startDate,
  endDate,
  onChange,
  defaultMonth,
  disabled
}: DateRangePickerProps) => {
  const [open, setOpen] = useState(false);

  const range = useMemo<DateRange | undefined>(() => {
    if (!startDate && !endDate) {
      return undefined;
    }
    return { from: startDate, to: endDate };
  }, [startDate, endDate]);

  const handleSelect = (value: DateRange | undefined) => {
    onChange(value);
  };

  const firstMonth = startDate ?? defaultMonth ?? new Date();
  const titleText = !range?.from ? "Select start date" : !range?.to ? "Select end date" : "Dates selected";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{label}</span>
        {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex w-full items-center gap-2 text-left text-sm",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <Card className="flex flex-1 flex-col gap-1 border border-input bg-background px-3 py-2">
              <span className="text-xs text-muted-foreground">Start</span>
              <span className={cn("text-sm", !startDate && "text-muted-foreground")}>
                {startDate ? formatLabel(startDate) : "Select"}
              </span>
            </Card>
            <Card className="flex flex-1 flex-col gap-1 border border-input bg-background px-3 py-2">
              <span className="text-xs text-muted-foreground">End</span>
              <span className={cn("text-sm", !endDate && "text-muted-foreground")}>
                {endDate ? formatLabel(endDate) : "Select"}
              </span>
            </Card>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{titleText}</DialogTitle>
          </DialogHeader>
          <Card className="p-4">
            <DayPicker
              mode="range"
              numberOfMonths={2}
              selected={range}
              defaultMonth={firstMonth}
              onSelect={handleSelect}
              pagedNavigation
              showOutsideDays
            />
          </Card>
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              Clear dates
            </Button>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DateRangePicker;