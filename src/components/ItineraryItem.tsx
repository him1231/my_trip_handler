import { ItineraryItem } from "../lib/types";

type ItineraryItemProps = {
  item: ItineraryItem;
};

const formatTime = (date?: Date) => {
  if (!date) {
    return null;
  }
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const ItineraryItem = ({ item }: ItineraryItemProps) => {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="inline-actions">
        <strong>{item.title}</strong>
        <span className="tag">{item.type}</span>
        {item.startTime ? <span className="tag">{formatTime(item.startTime)}</span> : null}
      </div>
      {item.note ? <p className="muted">{item.note}</p> : null}
    </div>
  );
};

export default ItineraryItem;
