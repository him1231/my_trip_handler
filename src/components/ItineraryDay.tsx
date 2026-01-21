import { ItineraryDay as DayType, ItineraryItem as ItemType } from "../lib/types";
import { Card } from "./ui/card";
import ItineraryItem from "./ItineraryItem";
import ItineraryItemForm from "./ItineraryItemForm";

type ItineraryDayProps = {
  day: DayType;
  items: ItemType[];
  canEdit: boolean;
  onAddItem: (payload: {
    title: string;
    type: ItemType["type"];
    note?: string;
    startTime?: Date;
  }) => void;
};

const ItineraryDay = ({ day, items, canEdit, onAddItem }: ItineraryDayProps) => {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h3 className="text-lg font-semibold">
          Day {day.dayNumber} · {day.date.toLocaleDateString()}
        </h3>
        {day.note ? <p className="text-sm text-muted-foreground">{day.note}</p> : null}
      </div>

      <ItineraryItemForm dayDate={day.date} canEdit={canEdit} onSave={onAddItem} />

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <ItineraryItem key={item.id} item={item} />
        ))}
        {!items.length ? (
          <p className="text-sm text-muted-foreground">No items yet. Add the first activity.</p>
        ) : null}
      </div>
    </Card>
  );
};

export default ItineraryDay;
