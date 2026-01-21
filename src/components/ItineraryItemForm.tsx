import { useState } from "react";
import { ItineraryItemType } from "../lib/types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select";
import { Textarea } from "./ui/textarea";

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
    <Card className="bg-slate-50 p-4">
      <h4 className="text-base font-semibold">Add itinerary item</h4>
      <div className="mt-4 flex flex-col gap-3">
        <Select value={type} onValueChange={(value) => setType(value as ItineraryItemType)}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flight">Flight</SelectItem>
            <SelectItem value="hotel">Hotel</SelectItem>
            <SelectItem value="activity">Activity</SelectItem>
            <SelectItem value="restaurant">Restaurant</SelectItem>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        <Textarea
          placeholder="Optional notes"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button onClick={handleSubmit} disabled={!canEdit}>
          Add item
        </Button>
      </div>
    </Card>
  );
};

export default ItineraryItemForm;
