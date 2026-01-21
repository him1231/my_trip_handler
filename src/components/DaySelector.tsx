import { useEffect, useRef, useState } from "react";
import { ItineraryDay } from "../lib/types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type DaySelectorProps = {
  days: ItineraryDay[];
  selectedDayId: string | null;
  onSelect: (dayId: string) => void;
  onAdd: (date: Date) => void;
  onDelete: (dayId: string) => void;
  canEdit: boolean;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

const DaySelector = ({ days, selectedDayId, onSelect, onAdd, onDelete, canEdit }: DaySelectorProps) => {
  const [selectedDate, setSelectedDate] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const handleAdd = () => {
    if (!selectedDate) {
      return;
    }
    onAdd(new Date(selectedDate));
    setSelectedDate("");
  };

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Days</h3>
          <p className="text-sm text-muted-foreground">Plan each day of your trip.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={!canEdit}>
              Add day
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select a date</DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </div>
              <Button onClick={handleAdd} disabled={!selectedDate}>
                Add day
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex flex-col gap-2">
        {days.map((day) => (
          <div key={day.id} className="relative flex items-center gap-2">
            <Button
              variant={selectedDayId === day.id ? "default" : "outline"}
              className="flex-1 justify-start pr-10"
              onClick={() => onSelect(day.id)}
            >
              Day {day.dayNumber} · {formatDate(day.date)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit}
              className={`absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-transparent shadow-none hover:bg-transparent ${
                selectedDayId === day.id ? "text-white" : "text-slate-500"
              }`}
              onClick={() => setOpenMenuId((prev) => (prev === day.id ? null : day.id))}
            >
              ⋯
            </Button>
            {openMenuId === day.id ? (
              <div
                ref={menuRef}
                className="absolute right-0 top-full z-10 mt-2 w-32 rounded-md border bg-white shadow"
              >
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-100"
                  onClick={() => {
                    setOpenMenuId(null);
                    onDelete(day.id);
                  }}
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {!days.length ? (
          <p className="text-sm text-muted-foreground">No days yet. Add the first day.</p>
        ) : null}
      </div>
    </Card>
  );
};

export default DaySelector;
