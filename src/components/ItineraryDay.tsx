import { useMemo, useState } from "react";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { ItineraryDay as DayType, ItineraryItem as ItemType, TimelineEntry } from "../lib/types";
import { Card } from "./ui/card";
import ItineraryItem from "./ItineraryItem";
import ItineraryItemForm from "./ItineraryItemForm";
import { Button } from "./ui/button";

type ItineraryDayProps = {
  day: DayType;
  dayKey: string;
  entries: Array<TimelineEntry & { entryId: string }>;
  canEdit: boolean;
  entryIds: string[];
  onAddItem: (payload: {
    title: string;
    type: ItemType["type"];
    note?: string;
    startTime?: Date;
    details?: ItemType["details"];
  }) => void;
  onUpdateItem: (itemId: string, payload: {
    title: string;
    type: ItemType["type"];
    note?: string;
    startTime?: Date;
    details?: ItemType["details"];
  }) => void;
  onSelectBooking?: (bookingId: string) => void;
  onToggleChecklist?: (itemId: string, items: NonNullable<ItemType["details"]>["checklistItems"]) => void;
};

const SortableEntry = ({
  entry,
  canEdit,
  onSelectBooking,
  onToggleChecklist,
  onSelectItem
}: {
  entry: TimelineEntry & { entryId: string };
  canEdit: boolean;
  onSelectBooking?: (bookingId: string) => void;
  onToggleChecklist?: (itemId: string, items: NonNullable<ItemType["details"]>["checklistItems"]) => void;
  onSelectItem?: (item: ItemType) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: entry.entryId
  });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ItineraryItem
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

const ItineraryDay = ({
  day,
  dayKey,
  entries,
  canEdit,
  entryIds,
  onAddItem,
  onUpdateItem,
  onSelectBooking,
  onToggleChecklist
}: ItineraryDayProps) => {
  const { setNodeRef } = useDroppable({ id: dayKey });
  const sortedEntries = useMemo(() => entries, [entries]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemType | null>(null);

  return (
    <Card className="flex flex-col gap-4 p-5" ref={setNodeRef}>
      <div>
        <h3 className="text-lg font-semibold">
          Day {day.dayNumber} · {day.date.toLocaleDateString()}
        </h3>
        {day.note ? <p className="text-sm text-muted-foreground">{day.note}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          disabled={!canEdit || Boolean(editingItem)}
          onClick={() => setShowForm((prev) => !prev)}
        >
          {showForm ? "Close" : "Add item"}
        </Button>
      </div>
      {showForm && !editingItem ? (
        <ItineraryItemForm
          dayDate={day.date}
          canEdit={canEdit}
          submitLabel="Add item"
          onCancel={() => setShowForm(false)}
          onSave={(payload) => {
            onAddItem(payload);
            setShowForm(false);
          }}
        />
      ) : null}

      <div className="flex flex-col gap-3">
        <SortableContext items={entryIds}>
          {sortedEntries.map((entry) => {
            if (entry.kind === "itinerary" && editingItem?.id === entry.item.id) {
              return (
                <div key={entry.entryId}>
                  <ItineraryItemForm
                    dayDate={day.date}
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
                      onUpdateItem(editingItem.id, payload);
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
                onSelectItem={(item) => {
                  setEditingItem(item);
                }}
              />
            );
          })}
        </SortableContext>
        {!sortedEntries.length ? (
          <p className="text-sm text-muted-foreground">No items yet. Add the first activity.</p>
        ) : null}
      </div>
    </Card>
  );
};

export default ItineraryDay;
