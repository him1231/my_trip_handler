import { useMemo, useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ChecklistItem, ItineraryDay, ItineraryItem, TimelineEntry } from "../lib/types";
import { Button } from "./ui/button";
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
  onUpdateItem: (day: ItineraryDay, itemId: string, payload: {
    title: string;
    type: ItineraryItem["type"];
    note?: string;
    startTime?: Date;
    details?: ItineraryItem["details"];
  }) => void;
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

const DayHeaderRow = ({
  entry,
  canEdit,
  isEditing,
  isActive,
  hasEntries,
  onDayRef,
  onToggleAdd,
  onAddItem,
  onCancelAdd
}: DayHeaderProps) => {
  const { setNodeRef, transform, transition } = useSortable({
    id: entry.entryId,
    disabled: true
  });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition
  };

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

const ItineraryTimeline = ({
  entries,
  sortableEntryIds,
  dayByKey,
  canEdit,
  onAddItem,
  onUpdateItem,
  onSelectBooking,
  onToggleChecklist,
  onDayRef
}: ItineraryTimelineProps) => {
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [activeAddDayKey, setActiveAddDayKey] = useState<string | null>(null);

  const onSelectItem = (item: ItineraryItem) => {
    setEditingItem(item);
    setActiveAddDayKey(null);
  };

  const sortedEntries = useMemo(() => entries, [entries]);
  const dayEntryCount = useMemo(() => {
    const counts = new Map<string, number>();
    sortedEntries.forEach((entry) => {
      if (entry.kind === "day") {
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
            const hasEntries = (dayEntryCount.get(entry.dayKey) ?? 0) > 0;
            return (
              <DayHeaderRow
                key={entry.entryId}
                entry={entry}
                canEdit={canEdit}
                isEditing={Boolean(editingItem)}
                isActive={isActive}
                hasEntries={hasEntries}
                onDayRef={onDayRef}
                onToggleAdd={() => {
                  setEditingItem(null);
                  setActiveAddDayKey((prev) => (prev === entry.dayKey ? null : entry.dayKey));
                }}
                onAddItem={(payload) => onAddItem(entry.day, payload)}
                onCancelAdd={() => setActiveAddDayKey(null)}
              />
            );
          }

          if (entry.kind === "itinerary" && editingItem?.id === entry.item.id) {
            const day = dayByKey.get(entry.dayKey) ?? {
              id: entry.dayKey,
              tripId: entry.item.tripId,
              date: entry.item.date,
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
                    onUpdateItem(day, entry.item.id, payload);
                    setEditingItem(null);
                  }}
                />
              </div>
            );
          }

          return (
            <SortableEntry
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
