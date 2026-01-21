import { ItineraryDay as DayType, ItineraryItem as ItemType } from "../lib/types";
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
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h3>
          Day {day.dayNumber} · {day.date.toLocaleDateString()}
        </h3>
        {day.note ? <p className="muted">{day.note}</p> : null}
      </div>

      <ItineraryItemForm dayDate={day.date} canEdit={canEdit} onSave={onAddItem} />

      <div className="list">
        {items.map((item) => (
          <ItineraryItem key={item.id} item={item} />
        ))}
        {!items.length ? <p className="muted">No items yet. Add the first activity.</p> : null}
      </div>
    </div>
  );
};

export default ItineraryDay;
