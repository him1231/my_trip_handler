import { ItineraryDay } from "../lib/types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

type DaySelectorProps = {
  days: ItineraryDay[];
  selectedDayId: string | null;
  onSelect: (dayId: string) => void;
  onAdd: () => void;
  canEdit: boolean;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

const DaySelector = ({ days, selectedDayId, onSelect, onAdd, canEdit }: DaySelectorProps) => {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Days</h3>
          <p className="text-sm text-muted-foreground">Plan each day of your trip.</p>
        </div>
        <Button variant="outline" onClick={onAdd} disabled={!canEdit}>
          Add day
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {days.map((day) => (
          <Button
            key={day.id}
            variant={selectedDayId === day.id ? "default" : "outline"}
            onClick={() => onSelect(day.id)}
          >
            Day {day.dayNumber} · {formatDate(day.date)}
          </Button>
        ))}
        {!days.length ? (
          <p className="text-sm text-muted-foreground">No days yet. Add the first day.</p>
        ) : null}
      </div>
    </Card>
  );
};

export default DaySelector;
