import { memo, useCallback, useMemo, useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ChecklistItem, ItineraryDay, ItineraryItem, TimelineEntry, UnscheduledGroup } from "../lib/types";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import ItineraryItemForm from "./ItineraryItemForm";
import ItineraryItemCard from "./ItineraryItem";

type ItineraryTimelineEntry = TimelineEntry & { entryId: string; dayKey: string };

type ItineraryTimelineProps = {
  entries: ItineraryTimelineEntry[];
  sortableEntryIds: string[];
  dayByKey: Map<string, ItineraryDay>;
  canEdit: boolean;
  onAddItem: (day: ItineraryDay, payload: {
    title: string;
    type: ItineraryItem["type"];
    note?: string;
    startTime?: Date;
    details?: ItineraryItem["details"];
  }) => void;
  onAddUnscheduledItem: (group: UnscheduledGroup, payload: {
    title: string;
    type: ItineraryItem["type"];
    note?: string;
    startTime?: Date;
    details?: ItineraryItem["details"];
  }) => void;
  onUpdateItemEntry: (entry: ItineraryTimelineEntry, itemId: string, payload: {
    title: string;
    type: ItineraryItem["type"];
    note?: string;
    startTime?: Date;
    details?: ItineraryItem["details"];
  }) => void;
  onUpdateDay: (day: ItineraryDay, payload: { date: Date; note?: string }) => Promise<void>;
  onSelectBooking?: (bookingId: string) => void;
  onToggleChecklist?: (itemId: string, items: ChecklistItem[] | undefined) => void;
  onDayRef?: (dayId: string, node: HTMLDivElement | null) => void;
};

type SortableEntryProps = {
  entry: ItineraryTimelineEntry;
  canEdit: boolean;
  onSelectBooking?: (bookingId: string) => void;
  onToggleChecklist?: (itemId: string, items: ChecklistItem[] | undefined) => void;
  onSelectItem?: (item: ItineraryItem) => void;
};

type DayHeaderProps = {
  entry: ItineraryTimelineEntry & { kind: "day" };
  canEdit: boolean;
  isEditing: boolean;
  isActive: boolean;
  hasEntries: boolean;
  itemCount: number;
  onDayRef?: (dayId: string, node: HTMLDivElement | null) => void;
  onToggleAdd: () => void;
  onAddItem: (payload: {
    title: string;
    type: ItineraryItem["type"];
    note?: string;
    startTime?: Date;
    details?: ItineraryItem["details"];
  }) => void;
  onCancelAdd: () => void;
  onUpdateDay: (day: ItineraryDay, payload: { date: Date; note?: string }) => Promise<void>;
};

type GroupHeaderProps = {
  entry: ItineraryTimelineEntry & { kind: "group" };
  canEdit: boolean;
  isEditing: boolean;
  isActive: boolean;
  hasEntries: boolean;
  itemCount: number;
  onToggleAdd: () => void;
  onAddItem: (payload: {
    title: string;
    type: ItineraryItem["type"];
    note?: string;
    startTime?: Date;
    details?: ItineraryItem["details"];
  }) => void;
  onCancelAdd: () => void;
};

const entrySignature = (entry: ItineraryTimelineEntry) => {
  if (entry.kind === "day") {
    return `day:${entry.day.id}:${entry.day.dayNumber}:${entry.day.date.getTime()}:${entry.day.note ?? ""}:${
      entry.day.updatedAt?.getTime() ?? ""
    }`;
  }
  if (entry.kind === "group") {
    return `group:${entry.group.id}:${entry.group.title}:${entry.group.order}:${entry.group.isDefault ?? false}:${
      entry.group.updatedAt?.getTime() ?? ""
    }`;
  }
  if (entry.kind === "separator") {
    return `separator:${entry.label}`;
  }
  if (entry.kind === "booking") {
    return `booking:${entry.booking.id}:${entry.booking.order ?? ""}:${
      entry.booking.dayKey ?? ""
    }:${entry.booking.startTime?.getTime() ?? ""}:${entry.booking.title}:${
      entry.booking.updatedAt?.getTime() ?? ""
    }`;
  }
  return `itinerary:${entry.item.id}:${entry.item.order ?? ""}:${entry.item.dayKey}:${
    entry.item.startTime?.getTime() ?? ""
  }:${entry.item.title}:${entry.item.note ?? ""}:${entry.item.updatedAt?.getTime() ?? ""}`;
};

const SortableEntry = ({
  entry,
  canEdit,
  onSelectBooking,
  onToggleChecklist,
  onSelectItem
}: SortableEntryProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: entry.entryId,
    disabled: !canEdit
  });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ItineraryItemCard
        entry={entry}
        onSelectBooking={onSelectBooking}
        onToggleChecklist={onToggleChecklist}
        onSelectItem={onSelectItem}
        dragHandleProps={
          canEdit
            ? {
              ...attributes,
              ...listeners
            }
            : undefined
        }
      />
    </div>
  );
};

const MemoSortableEntry = memo(
  SortableEntry,
  (prev, next) => prev.canEdit === next.canEdit && entrySignature(prev.entry) === entrySignature(next.entry)
);

const DayHeaderRow = ({
  entry,
  canEdit,
  isEditing,
  isActive,
  hasEntries,
  itemCount,
  onDayRef,
  onToggleAdd,
  onAddItem,
  onCancelAdd,
  onUpdateDay
}: DayHeaderProps) => {
  const { setNodeRef, transform, transition } = useSortable({
    id: entry.entryId,
    disabled: true
  });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition
  };
  const [dayDate, setDayDate] = useState(() => {
    const offset = entry.day.date.getTimezoneOffset();
    const local = new Date(entry.day.date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  });
  const [dayNote, setDayNote] = useState(entry.day.note ?? "");
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        onDayRef?.(entry.day.id, node);
      }}
      style={style}
      className="flex flex-col gap-3"
    >
      <ItineraryItemCard entry={entry} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </span>
        <Button
          variant="outline"
          disabled={!canEdit || isEditing}
          onClick={onToggleAdd}
        >
          {isActive ? "Close" : "Add item"}
        </Button>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (open) {
              const offset = entry.day.date.getTimezoneOffset();
              const local = new Date(entry.day.date.getTime() - offset * 60000);
              setDayDate(local.toISOString().slice(0, 10));
              setDayNote(entry.day.note ?? "");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="ghost" disabled={!canEdit}>
              Edit day
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit day</DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={dayDate}
                  onChange={(event) => setDayDate(event.target.value)}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={dayNote}
                  onChange={(event) => setDayNote(event.target.value)}
                  placeholder="Add notes for the day"
                />
              </div>
              <Button
                onClick={async () => {
                  if (!dayDate) {
                    return;
                  }
                  const nextDate = new Date(dayDate);
                  if (Number.isNaN(nextDate.getTime())) {
                    return;
                  }
                  setSaving(true);
                  try {
                    await onUpdateDay(entry.day, {
                      date: nextDate,
                      note: dayNote.trim() || undefined
                    });
                      setDialogOpen(false);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={!canEdit || !dayDate || saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isActive && !isEditing ? (
        <ItineraryItemForm
          dayDate={entry.day.date}
          canEdit={canEdit}
          submitLabel="Add item"
          onCancel={onCancelAdd}
          onSave={(payload) => {
            onAddItem(payload);
            onCancelAdd();
          }}
        />
      ) : null}
      {!hasEntries ? (
        <p className="text-sm text-muted-foreground">No items yet. Add the first activity.</p>
      ) : null}
    </div>
  );
};

const MemoDayHeaderRow = memo(
  DayHeaderRow,
  (prev, next) =>
    prev.canEdit === next.canEdit
    && prev.isEditing === next.isEditing
    && prev.isActive === next.isActive
    && prev.hasEntries === next.hasEntries
    && prev.itemCount === next.itemCount
    && entrySignature(prev.entry) === entrySignature(next.entry)
);

const GroupHeaderRow = ({
  entry,
  canEdit,
  isEditing,
  isActive,
  hasEntries,
  itemCount,
  onToggleAdd,
  onAddItem,
  onCancelAdd
}: GroupHeaderProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: entry.entryId,
    disabled: !canEdit
  });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-3">
      <ItineraryItemCard
        entry={entry}
        dragHandleProps={
          canEdit
            ? {
              ...attributes,
              ...listeners
            }
            : undefined
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </span>
        <Button
          variant="outline"
          disabled={!canEdit || isEditing}
          onClick={onToggleAdd}
        >
          {isActive ? "Close" : "Add item"}
        </Button>
      </div>
      {isActive && !isEditing ? (
        <ItineraryItemForm
          dayDate={new Date()}
          canEdit={canEdit}
          submitLabel="Add item"
          onCancel={onCancelAdd}
          onSave={(payload) => {
            onAddItem(payload);
            onCancelAdd();
          }}
        />
      ) : null}
      {!hasEntries ? (
        <p className="text-sm text-muted-foreground">No items yet. Add the first activity.</p>
      ) : null}
    </div>
  );
};

const SeparatorRow = ({ entry }: { entry: ItineraryTimelineEntry & { kind: "separator" } }) => {
  const { setNodeRef, transform, transition } = useSortable({
    id: entry.entryId,
    disabled: true
  });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-md bg-blue-100 px-3 py-4 shadow-sm">
      {/* <Separator /> */}
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
        {entry.label}
      </p>
    </div>
  );
};

const MemoGroupHeaderRow = memo(
  GroupHeaderRow,
  (prev, next) =>
    prev.canEdit === next.canEdit
    && prev.isEditing === next.isEditing
    && prev.isActive === next.isActive
    && prev.hasEntries === next.hasEntries
    && prev.itemCount === next.itemCount
    && entrySignature(prev.entry) === entrySignature(next.entry)
);

const ItineraryTimeline = ({
  entries,
  sortableEntryIds,
  dayByKey,
  canEdit,
  onAddItem,
  onAddUnscheduledItem,
  onUpdateItemEntry,
  onUpdateDay,
  onSelectBooking,
  onToggleChecklist,
  onDayRef
}: ItineraryTimelineProps) => {
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [activeAddDayKey, setActiveAddDayKey] = useState<string | null>(null);
  const [activeAddGroupKey, setActiveAddGroupKey] = useState<string | null>(null);

  const onSelectItem = useCallback((item: ItineraryItem) => {
    setEditingItem(item);
    setActiveAddDayKey(null);
  }, []);

  const sortedEntries = useMemo(() => entries, [entries]);
  const sectionEntryCount = useMemo(() => {
    const counts = new Map<string, number>();
    sortedEntries.forEach((entry) => {
      if (entry.kind === "day" || entry.kind === "group") {
        counts.set(entry.dayKey, 0);
        return;
      }
      counts.set(entry.dayKey, (counts.get(entry.dayKey) ?? 0) + 1);
    });
    return counts;
  }, [sortedEntries]);
  return (
    <SortableContext items={sortableEntryIds} strategy={verticalListSortingStrategy}>
      <div className="flex flex-col gap-4">
        {sortedEntries.map((entry) => {
          if (entry.kind === "day") {
            const isActive = activeAddDayKey === entry.dayKey;
            const itemCount = sectionEntryCount.get(entry.dayKey) ?? 0;
            const hasEntries = itemCount > 0;
            return (
              <MemoDayHeaderRow
                key={entry.entryId}
                entry={entry}
                canEdit={canEdit}
                isEditing={Boolean(editingItem)}
                isActive={isActive}
                hasEntries={hasEntries}
                itemCount={itemCount}
                onDayRef={onDayRef}
                onToggleAdd={() => {
                  setEditingItem(null);
                  setActiveAddDayKey((prev) => (prev === entry.dayKey ? null : entry.dayKey));
                  setActiveAddGroupKey(null);
                }}
                onAddItem={(payload) => onAddItem(entry.day, payload)}
                onCancelAdd={() => setActiveAddDayKey(null)}
                onUpdateDay={onUpdateDay}
              />
            );
          }

          if (entry.kind === "group") {
            const isActive = activeAddGroupKey === entry.dayKey;
            const itemCount = sectionEntryCount.get(entry.dayKey) ?? 0;
            const hasEntries = itemCount > 0;
            return (
              <MemoGroupHeaderRow
                key={entry.entryId}
                entry={entry}
                canEdit={canEdit}
                isEditing={Boolean(editingItem)}
                isActive={isActive}
                hasEntries={hasEntries}
                itemCount={itemCount}
                onToggleAdd={() => {
                  setEditingItem(null);
                  setActiveAddDayKey(null);
                  setActiveAddGroupKey((prev) => (prev === entry.dayKey ? null : entry.dayKey));
                }}
                onAddItem={(payload) => onAddUnscheduledItem(entry.group, payload)}
                onCancelAdd={() => setActiveAddGroupKey(null)}
              />
            );
          }

          if (entry.kind === "separator") {
            return <SeparatorRow key={entry.entryId} entry={entry} />;
          }

          if (entry.kind === "itinerary" && editingItem?.id === entry.item.id) {
            const day = dayByKey.get(entry.dayKey) ?? {
              id: entry.dayKey,
              tripId: entry.item.tripId,
              date: entry.item.date ?? new Date(),
              dayNumber: 0
            };
            const dayDate = day.date;
            return (
              <div key={entry.entryId}>
                <ItineraryItemForm
                  dayDate={dayDate}
                  canEdit={canEdit}
                  initialValues={{
                    type: editingItem.type,
                    title: editingItem.title,
                    note: editingItem.note,
                    startTime: editingItem.startTime,
                    details: editingItem.details
                  }}
                  submitLabel="Update item"
                  onCancel={() => setEditingItem(null)}
                  onSave={(payload) => {
                    onUpdateItemEntry(entry, entry.item.id, payload);
                    setEditingItem(null);
                  }}
                />
              </div>
            );
          }

          return (
            <MemoSortableEntry
              key={entry.entryId}
              entry={entry}
              canEdit={canEdit}
              onSelectBooking={onSelectBooking}
              onToggleChecklist={onToggleChecklist}
              onSelectItem={onSelectItem}
            />
          );
        })}
      </div>
    </SortableContext>
  );
};

export default ItineraryTimeline;
