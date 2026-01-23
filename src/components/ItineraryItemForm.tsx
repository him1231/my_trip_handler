import { useState } from "react";
import { ChecklistItem, ItineraryItemDetails, ItineraryItemType } from "../lib/types";
import FlightItemForm from "./FlightItemForm";
import HotelItemForm from "./HotelItemForm";
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
  initialValues?: {
    type: ItineraryItemType;
    title: string;
    note?: string;
    startTime?: Date;
    details?: ItineraryItemDetails;
  };
  submitLabel?: string;
  onCancel?: () => void;
  onSave: (payload: {
    type: ItineraryItemType;
    title: string;
    note?: string;
    startTime?: Date;
    details?: ItineraryItemDetails;
  }) => void;
};

const ItineraryItemForm = ({
  dayDate,
  canEdit,
  initialValues,
  submitLabel = "Add item",
  onCancel,
  onSave
}: ItineraryItemFormProps) => {
  const [type, setType] = useState<ItineraryItemType>(initialValues?.type ?? "activity");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [note, setNote] = useState(initialValues?.note ?? "");
  const [time, setTime] = useState(
    initialValues?.startTime
      ? initialValues.startTime.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      : ""
  );
  const [checklistTitle, setChecklistTitle] = useState("");
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    initialValues?.details?.checklistItems ?? []
  );

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

    let details: ItineraryItemDetails | undefined;
    if (type === "checklist") {
      details = {
        checklistItems: checklistItems.length ? checklistItems : undefined
      };
    }

    onSave({
      type,
      title: title.trim(),
      note: note.trim() || undefined,
      startTime,
      details
    });

    setTitle("");
    setNote("");
    setTime("");
    setChecklistTitle("");
    setChecklistItems([]);
  };

  return (
    <Card className="bg-slate-50 p-4">
      <h4 className="text-base font-semibold">{submitLabel}</h4>
      <div className="mt-4 flex flex-col gap-3">
        <Select value={type} onValueChange={(value) => setType(value as ItineraryItemType)}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activity">Activity</SelectItem>
            <SelectItem value="restaurant">Restaurant</SelectItem>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
            <SelectItem value="checklist">List</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        {type !== "checklist" ? (
          <Textarea
            placeholder="Optional notes"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        ) : null}
        {type === "checklist" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Checklist item"
                value={checklistTitle}
                onChange={(event) => setChecklistTitle(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!checklistTitle.trim()) {
                    return;
                  }
                  setChecklistItems((prev) => [
                    ...prev,
                    {
                      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                      title: checklistTitle.trim(),
                      done: false
                    }
                  ]);
                  setChecklistTitle("");
                }}
              >
                Add
              </Button>
            </div>
            {checklistItems.length ? (
              <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
                {checklistItems.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={entry.done}
                      onChange={() =>
                        setChecklistItems((prev) =>
                          prev.map((item) =>
                            item.id === entry.id ? { ...item, done: !item.done } : item
                          )
                        )
                      }
                    />
                    <span className={entry.done ? "line-through" : ""}>{entry.title}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="ml-auto"
                      onClick={() =>
                        setChecklistItems((prev) => prev.filter((item) => item.id !== entry.id))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSubmit} disabled={!canEdit}>
            {submitLabel}
          </Button>
          {onCancel ? (
            <Button variant="outline" type="button" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

export default ItineraryItemForm;
