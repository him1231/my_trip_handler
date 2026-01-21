import { useState } from "react";
import { ItineraryItemType } from "../lib/types";

type ItineraryItemFormProps = {
  dayDate: Date;
  canEdit: boolean;
  onSave: (payload: {
    type: ItineraryItemType;
    title: string;
    note?: string;
    startTime?: Date;
  }) => void;
};

const ItineraryItemForm = ({ dayDate, canEdit, onSave }: ItineraryItemFormProps) => {
  const [type, setType] = useState<ItineraryItemType>("activity");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [time, setTime] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }

    let startTime: Date | undefined;
    if (time) {
      const [hours, minutes] = time.split(":").map((value) => Number(value));
      startTime = new Date(dayDate);
      startTime.setHours(hours);
      startTime.setMinutes(minutes);
      startTime.setSeconds(0);
      startTime.setMilliseconds(0);
    }

    onSave({
      type,
      title: title.trim(),
      note: note.trim() || undefined,
      startTime
    });

    setTitle("");
    setNote("");
    setTime("");
  };

  return (
    <div className="card" style={{ background: "#f8fafc" }}>
      <h4>Add itinerary item</h4>
      <div className="list">
        <select value={type} onChange={(event) => setType(event.target.value as ItineraryItemType)}>
          <option value="flight">Flight</option>
          <option value="hotel">Hotel</option>
          <option value="activity">Activity</option>
          <option value="restaurant">Restaurant</option>
          <option value="note">Note</option>
          <option value="transport">Transport</option>
        </select>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        <textarea
          placeholder="Optional notes"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <button className="primary-button" onClick={handleSubmit} disabled={!canEdit}>
          Add item
        </button>
      </div>
    </div>
  );
};

export default ItineraryItemForm;
