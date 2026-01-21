import { ItineraryDay } from "../lib/types";

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
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="inline-actions" style={{ justifyContent: "space-between" }}>
        <div>
          <h3>Days</h3>
          <p className="muted">Plan each day of your trip.</p>
        </div>
        <button className="secondary-button" onClick={onAdd} disabled={!canEdit}>
          Add day
        </button>
      </div>
      <div className="list">
        {days.map((day) => (
          <button
            key={day.id}
            className={selectedDayId === day.id ? "primary-button" : "secondary-button"}
            onClick={() => onSelect(day.id)}
          >
            Day {day.dayNumber} · {formatDate(day.date)}
          </button>
        ))}
        {!days.length ? <p className="muted">No days yet. Add the first day.</p> : null}
      </div>
    </div>
  );
};

export default DaySelector;
