import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { closestCenter, DndContext, DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove } from "@dnd-kit/sortable";
import DaySelector from "../components/DaySelector";
import ShareDialog from "../components/ShareDialog";
import ItineraryTimeline from "../components/ItineraryTimeline";
import MapPanel from "../components/MapPanel";
import TabButton from "../components/TabButton";
import TripBookingsTab from "../components/TripBookingsTab";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../lib/auth";
import {
  addItem,
  addLocation,
  addBooking,
  createDay,
  deleteDay,
  deleteBooking,
  deleteTrip,
  subscribeDays,
  subscribeItinerary,
  subscribeBookings,
  subscribeLocations,
  subscribeTrip,
  updateTripDestinationPlaceId,
  updateBooking,
  updateItem
} from "../lib/firestore";
import {
  ChecklistItem,
  ItineraryDay as DayType,
  ItineraryItem,
  TimelineEntry,
  Trip,
  TripBooking,
  TripLocation
} from "../lib/types";

const TripPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [locations, setLocations] = useState<TripLocation[]>([]);
  const [days, setDays] = useState<DayType[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [bookingEditId, setBookingEditId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ lat: number; lng: number; name?: string; address?: string } | null>(
    null
  );
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"itinerary" | "bookings" | "map" | "expenses" | "journal">("itinerary");
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!tripId) {
      return;
    }
    const unsubscribe = subscribeTrip(tripId, setTrip);
    return unsubscribe;
  }, [tripId]);

  useEffect(() => {
    if (!tripId) {
      return;
    }
    const unsubscribe = subscribeLocations(tripId, setLocations);
    return unsubscribe;
  }, [tripId]);

  useEffect(() => {
    if (!tripId) {
      return;
    }
    const unsubscribe = subscribeDays(tripId, (nextDays) => {
      const startDate = trip?.startDate ? new Date(trip.startDate) : null;
      if (startDate) {
        startDate.setHours(0, 0, 0, 0);
      }
      const normalized = nextDays.map((day) => {
        if (!startDate) {
          return day;
        }
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((dayDate.getTime() - startDate.getTime()) / 86400000);
        return {
          ...day,
          dayNumber: diffDays + 1
        };
      });

      setDays(normalized);
      if (!selectedDayId && normalized.length) {
        setSelectedDayId(normalized[0].id);
      }
      if (selectedDayId && !normalized.find((day) => day.id === selectedDayId)) {
        setSelectedDayId(normalized[0]?.id ?? null);
      }
    });
    return unsubscribe;
  }, [tripId, selectedDayId, trip?.startDate]);

  useEffect(() => {
    if (!tripId) {
      setItineraryItems([]);
      return;
    }
    const unsubscribe = subscribeItinerary(tripId, setItineraryItems);
    return unsubscribe;
  }, [tripId]);

  useEffect(() => {
    if (!tripId) {
      setBookings([]);
      return;
    }
    const unsubscribe = subscribeBookings(tripId, setBookings);
    return unsubscribe;
  }, [tripId]);

  useEffect(() => {
    if (pending?.name) {
      setName(pending.name);
    }
  }, [pending]);

  const role = useMemo(() => {
    if (!user || !trip) {
      return null;
    }
    return trip.members?.[user.uid]?.role ?? null;
  }, [trip, user]);

  const canEdit = role === "owner" || role === "editor";
  const isOwner = role === "owner";

  const selectedDay = days.find((day) => day.id === selectedDayId) ?? null;

  const toDayKey = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  };

  const applyDayToTime = (dayDate: Date, time?: Date) => {
    if (!time) {
      return new Date(dayDate);
    }
    const next = new Date(dayDate);
    next.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return next;
  };

  const buildOrder = (date: Date, time?: Date) => {
    const base = new Date(date);
    if (!time) {
      base.setHours(0, 0, 0, 0);
      return base.getTime();
    }
    base.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return base.getTime();
  };

  const dayIdByKey = useMemo(() => {
    const map = new Map<string, string>();
    days.forEach((day) => {
      map.set(toDayKey(day.date), day.id);
    });
    return map;
  }, [days]);

  const dayByKey = useMemo(() => {
    const map = new Map<string, DayType>();
    days.forEach((day) => {
      map.set(toDayKey(day.date), day);
    });
    return map;
  }, [days]);

  const timelineEntries = useMemo(() => {
    const entries: Array<TimelineEntry & { entryId: string; dayKey: string; order: number | undefined }> = [];

    itineraryItems.forEach((item) => {
      const dayKey = item.dayKey || toDayKey(item.date);
      entries.push({
        kind: "itinerary",
        item,
        entryId: `itinerary:${item.id}`,
        dayKey,
        order: item.order
      });
    });

    bookings.forEach((booking) => {
      const dayKey = booking.dayKey || toDayKey(booking.date);
      entries.push({
        kind: "booking",
        booking,
        entryId: `booking:${booking.id}`,
        dayKey,
        order: booking.order
      });
    });

    return entries;
  }, [bookings, itineraryItems]);

  const entriesByDay = useMemo(() => {
    const grouped = new Map<string, Array<TimelineEntry & { entryId: string }>>();
    days.forEach((day) => {
      grouped.set(toDayKey(day.date), []);
    });
    timelineEntries.forEach((entry) => {
      if (!grouped.has(entry.dayKey)) {
        grouped.set(entry.dayKey, []);
      }
      grouped.get(entry.dayKey)?.push(entry);
    });

    grouped.forEach((entries) => {
      entries.sort((a, b) => {
        const orderA = a.order;
        const orderB = b.order;
        if (orderA !== undefined || orderB !== undefined) {
          if (orderA === undefined) return 1;
          if (orderB === undefined) return -1;
          return orderA - orderB;
        }
        const timeA = a.kind === "booking"
          ? a.booking.startTime?.getTime() ?? new Date(a.booking.date).setHours(0, 0, 0, 0)
          : a.item.startTime?.getTime() ?? new Date(a.item.date).setHours(0, 0, 0, 0);
        const timeB = b.kind === "booking"
          ? b.booking.startTime?.getTime() ?? new Date(b.booking.date).setHours(0, 0, 0, 0)
          : b.item.startTime?.getTime() ?? new Date(b.item.date).setHours(0, 0, 0, 0);
        return timeA - timeB;
      });
    });

    return grouped;
  }, [days, timelineEntries]);

  const timelineSections = useMemo(() => {
    return days.map((day) => {
      const dayKey = toDayKey(day.date);
      return {
        day,
        dayKey,
        entries: entriesByDay.get(dayKey) ?? []
      };
    });
  }, [days, entriesByDay]);

  const flatTimeline = useMemo(() => {
    const flattened: Array<TimelineEntry & { entryId: string; dayKey: string }> = [];
    timelineSections.forEach((section) => {
      flattened.push({
        kind: "day",
        day: section.day,
        dayKey: section.dayKey,
        entryId: `day:${section.dayKey}`
      });
      section.entries.forEach((entry) => flattened.push(entry));
    });
    return flattened;
  }, [timelineSections]);

  const sortableEntryIds = useMemo(() => flatTimeline.map((entry) => entry.entryId), [flatTimeline]);

  const orderedDayKeys = useMemo(
    () =>
      [...days]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((day) => toDayKey(day.date)),
    [days]
  );

  const entryById = useMemo(() => {
    const map = new Map<string, TimelineEntry & { entryId: string; dayKey: string }>();
    flatTimeline.forEach((entry) => {
      map.set(entry.entryId, entry);
    });
    return map;
  }, [flatTimeline]);

  const handleAddDay = async (date: Date) => {
    if (!tripId || !canEdit) {
      return;
    }
    const startDate = trip?.startDate ? new Date(trip.startDate) : null;
    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
    }
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    let dayNumber = 1;
    if (startDate) {
      dayNumber = Math.floor((targetDate.getTime() - startDate.getTime()) / 86400000) + 1;
    } else {
      const sorted = [...days].sort((a, b) => a.date.getTime() - b.date.getTime());
      const insertIndex = sorted.findIndex((day) => day.date.getTime() > targetDate.getTime());
      dayNumber = insertIndex === -1 ? sorted.length + 1 : insertIndex + 1;
    }
    await createDay(tripId, dayNumber, targetDate);
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!tripId || !canEdit) {
      return;
    }
    const confirmed = window.confirm("Delete this day and its items?");
    if (!confirmed) {
      return;
    }
    await deleteDay(tripId, dayId);
  };

  const handleAddItem = async (
    day: DayType,
    payload: {
      title: string;
      type: ItineraryItem["type"];
      note?: string;
      startTime?: Date;
      details?: ItineraryItem["details"];
    }
  ) => {
    if (!tripId || !user) {
      return;
    }
    const dayKey = toDayKey(day.date);
    await addItem(tripId, {
      ...payload,
      dayKey,
      date: day.date,
      order: buildOrder(day.date, payload.startTime),
      createdBy: user.uid
    });
  };

  const handleAddBookingItem = async (payload: {
    title: string;
    type: "flight" | "hotel";
    details: ItineraryItem["details"];
    startTime?: Date;
    date: Date;
  }) => {
    if (!tripId || !user) {
      return;
    }

    await addBooking(tripId, {
      title: payload.title,
      type: payload.type,
      details: payload.details,
      startTime: payload.startTime,
      date: payload.date,
      dayKey: toDayKey(payload.date),
      order: buildOrder(payload.date, payload.startTime),
      createdBy: user.uid
    });
  };

  const handleUpdateBookingItem = async (payload: {
    bookingId: string;
    title: string;
    type: "flight" | "hotel";
    details: ItineraryItem["details"];
    startTime?: Date;
    date: Date;
  }) => {
    if (!tripId || !user) {
      return;
    }
    await updateBooking(tripId, payload.bookingId, {
      title: payload.title,
      type: payload.type,
      details: payload.details,
      startTime: payload.startTime,
      date: payload.date,
      dayKey: toDayKey(payload.date)
    });
  };

  const handleToggleChecklist = async (itemId: string, items: ChecklistItem[] | undefined) => {
    if (!tripId) {
      return;
    }
    await updateItem(tripId, itemId, {
      details: {
        checklistItems: items
      }
    });
  };

  const handleUpdateItem = async (itemId: string, payload: {
    title: string;
    type: ItineraryItem["type"];
    note?: string;
    startTime?: Date;
    details?: ItineraryItem["details"];
    dayKey: string;
    date: Date;
  }) => {
    if (!tripId) {
      return;
    }
    await updateItem(tripId, itemId, {
      title: payload.title,
      type: payload.type,
      note: payload.note,
      startTime: payload.startTime,
      details: payload.details,
      dayKey: payload.dayKey,
      date: payload.date,
      order: buildOrder(payload.date, payload.startTime)
    });
  };

  const handleSelectBookingEdit = (bookingId: string) => {
    setActiveTab("bookings");
    setBookingEditId(bookingId);
  };

  const handleSelectDay = (dayId: string) => {
    setSelectedDayId(dayId);
    const node = dayRefs.current[dayId];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const persistOrderForDay = async (dayKey: string, entryIds: string[]) => {
    if (!tripId) {
      return;
    }
    await Promise.all(
      entryIds.map((entryId, index) => {
        const entry = entryById.get(entryId);
        if (!entry) {
          return Promise.resolve();
        }
        if (entry.kind === "itinerary") {
          return updateItem(tripId, entry.item.id, { order: index });
        }
        return updateBooking(tripId, entry.booking.id, { order: index });
      })
    );
  };

  const updateEntryDay = async (entryId: string, targetDayKey: string) => {
    if (!tripId) {
      return;
    }
    const entry = entryById.get(entryId);
    const targetDay = dayByKey.get(targetDayKey);
    if (!entry || !targetDay) {
      return;
    }
    if (entry.kind === "itinerary") {
      await updateItem(tripId, entry.item.id, {
        dayKey: targetDayKey,
        date: targetDay.date,
        startTime: applyDayToTime(targetDay.date, entry.item.startTime)
      });
    } else {
      await updateBooking(tripId, entry.booking.id, {
        dayKey: targetDayKey,
        date: targetDay.date,
        startTime: applyDayToTime(targetDay.date, entry.booking.startTime)
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!canEdit) {
      return;
    }
    const { active, over } = event;
    if (!over) {
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeEntry = entryById.get(activeId);
    if (!activeEntry || activeEntry.kind === "day") {
      return;
    }
    const fromDayKey = activeEntry.dayKey;
    const activeIndex = sortableEntryIds.indexOf(activeId);
    const overIndex = sortableEntryIds.indexOf(overId);
    if (activeIndex === -1 || overIndex === -1) {
      return;
    }

    const isHeaderDrop = overId.startsWith("day:");
    const isAboveHeader = isHeaderDrop ? activeIndex > overIndex : false;

    const findPreviousHeaderIndex = (ids: string[], index: number) => {
      for (let i = index; i >= 0; i -= 1) {
        if (ids[i].startsWith("day:")) {
          return i;
        }
      }
      return -1;
    };

    const buildNextFlatIds = () => {
      if (!isHeaderDrop) {
        return arrayMove(sortableEntryIds, activeIndex, overIndex);
      }
      const updated = [...sortableEntryIds];
      const removedIndex = updated.indexOf(activeId);
      if (removedIndex === -1) {
        return null;
      }
      updated.splice(removedIndex, 1);

      const headerIndex = updated.indexOf(overId);
      if (headerIndex === -1) {
        return null;
      }
      const previousHeaderIndex = findPreviousHeaderIndex(updated, headerIndex - 1);
      const insertAt = isAboveHeader
        ? headerIndex
        : headerIndex + 1;
      const clampedInsertAt = Math.min(Math.max(insertAt, 0), updated.length);
      updated.splice(clampedInsertAt, 0, activeId);
      return updated;
    };

    const nextFlatIds = buildNextFlatIds();
    if (!nextFlatIds) {
      return;
    }

    const findTargetDayKey = (ids: string[], index: number) => {
      for (let i = index; i >= 0; i -= 1) {
        const id = ids[i];
        if (id.startsWith("day:")) {
          return id.replace("day:", "");
        }
      }
      const firstHeader = ids.find((id) => id.startsWith("day:"));
      return firstHeader ? firstHeader.replace("day:", "") : null;
    };

    const targetDayKey = isHeaderDrop
      ? isAboveHeader
        ? (() => {
          const headerIndex = nextFlatIds.indexOf(overId);
          const previousHeaderIndex = findPreviousHeaderIndex(nextFlatIds, headerIndex - 1);
          const prevHeaderId = previousHeaderIndex >= 0 ? nextFlatIds[previousHeaderIndex] : null;
          return prevHeaderId ? prevHeaderId.replace("day:", "") : findTargetDayKey(nextFlatIds, headerIndex);
        })()
        : overId.replace("day:", "")
      : findTargetDayKey(nextFlatIds, overIndex);
    if (!targetDayKey) {
      return;
    }

    const nextDayOrders = new Map<string, string[]>();
    let currentDayKey: string | null = null;
    nextFlatIds.forEach((id) => {
      if (id.startsWith("day:")) {
        currentDayKey = id.replace("day:", "");
        if (!nextDayOrders.has(currentDayKey)) {
          nextDayOrders.set(currentDayKey, []);
        }
        return;
      }
      if (currentDayKey) {
        nextDayOrders.get(currentDayKey)?.push(id);
      }
    });

    const nextFrom = nextDayOrders.get(fromDayKey) ?? [];
    const nextTo = nextDayOrders.get(targetDayKey) ?? [];

    if (fromDayKey === targetDayKey) {
      await persistOrderForDay(fromDayKey, nextFrom);
      return;
    }

    await updateEntryDay(activeId, targetDayKey);
    await Promise.all([
      persistOrderForDay(fromDayKey, nextFrom),
      persistOrderForDay(targetDayKey, nextTo)
    ]);
  };

  const handleDeleteBookingItem = async (bookingId: string) => {
    if (!tripId || !canEdit) {
      return;
    }
    const confirmed = window.confirm("Delete this booking?");
    if (!confirmed) {
      return;
    }
    await deleteBooking(tripId, bookingId);
  };

  const handleDeleteTrip = async () => {
    if (!tripId || !isOwner) {
      return;
    }
    const confirmed = window.confirm("Delete this trip? This cannot be undone.");
    if (!confirmed) {
      return;
    }
    await deleteTrip(tripId);
    navigate("/");
  };

  const handleSaveLocation = async () => {
    if (!tripId || !pending || !user || !name.trim()) {
      return;
    }
    setSaving(true);
    try {
      await addLocation(tripId, {
        name: name.trim(),
        lat: pending.lat,
        lng: pending.lng,
        address: pending.address,
        note: note.trim() || undefined,
        createdBy: user.uid
      });
      setPending(null);
      setName("");
      setNote("");
    } finally {
      setSaving(false);
    }
  };

  const handleDestinationPlaceId = async (placeId: string) => {
    if (!tripId || !canEdit || trip?.destinationPlaceId === placeId) {
      return;
    }
    await updateTripDestinationPlaceId(tripId, placeId);
  };

  if (!tripId) {
    return <p className="text-sm text-muted-foreground">Missing trip id.</p>;
  }

  if (!trip) {
    return <p className="text-sm text-muted-foreground">Loading trip details...</p>;
  }

  const tripStart = trip.startDate ? new Date(trip.startDate) : null;
  const tripEnd = trip.endDate ? new Date(trip.endDate) : null;
  const tripDuration =
    tripStart && tripEnd
      ? Math.floor((tripEnd.getTime() - tripStart.getTime()) / 86400000) + 1
      : null;

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{trip.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Role: {role ?? "unknown"} · Members: {trip.memberIds.length}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {trip.destination ? <span>{trip.destination}</span> : <span>No destination</span>}
              {tripStart && tripEnd ? (
                <span>
                  · {tripStart.toLocaleDateString()} → {tripEnd.toLocaleDateString()}
                </span>
              ) : null}
              {tripDuration ? <span>· {tripDuration} days</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {trip.inviteToken && (role === "owner" || role === "editor") ? (
              <ShareDialog inviteToken={trip.inviteToken} />
            ) : null}
            {isOwner ? (
              <Button variant="outline" onClick={handleDeleteTrip}>
                Delete trip
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <TabButton label="Itinerary" active={activeTab === "itinerary"} onClick={() => setActiveTab("itinerary")} />
        <TabButton label="Bookings" active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")} />
        <TabButton label="Map" active={activeTab === "map"} onClick={() => setActiveTab("map")} />
        <TabButton label="Expenses" active={activeTab === "expenses"} onClick={() => setActiveTab("expenses")} />
        <TabButton label="Journal" active={activeTab === "journal"} onClick={() => setActiveTab("journal")} />
      </div>

      {activeTab === "itinerary" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,360px)_1fr]">
          <DaySelector
            days={days}
            selectedDayId={selectedDayId}
            onSelect={handleSelectDay}
            onAdd={handleAddDay}
            onDelete={handleDeleteDay}
            canEdit={canEdit}
          />
          <DndContext
            onDragEnd={handleDragEnd}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
          >
            {days.length ? (
              <ItineraryTimeline
                entries={flatTimeline}
                sortableEntryIds={sortableEntryIds}
                dayByKey={dayByKey}
                canEdit={canEdit}
                onAddItem={handleAddItem}
                onUpdateItem={(day, itemId, payload) =>
                  handleUpdateItem(itemId, {
                    ...payload,
                    dayKey: toDayKey(day.date),
                    date: day.date
                  })
                }
                onSelectBooking={handleSelectBookingEdit}
                onToggleChecklist={handleToggleChecklist}
                onDayRef={(dayId, node) => {
                  dayRefs.current[dayId] = node;
                }}
              />
            ) : (
              <Card className="p-6">
                <h3 className="text-lg font-semibold">No days yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add a day to start planning your itinerary.
                </p>
              </Card>
            )}
          </DndContext>
        </div>
      ) : null}

      {activeTab === "map" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,360px)_1fr]">
          <Card className="flex flex-col gap-4 p-5">
            <div>
              <h3 className="text-lg font-semibold">Locations</h3>
              <p className="text-sm text-muted-foreground">Click the map to add a location.</p>
            </div>

            {pending ? (
              <Card className="bg-slate-50 p-4">
                <h4 className="text-base font-semibold">Selected spot</h4>
                <p className="text-sm text-muted-foreground">
                  {pending.lat.toFixed(4)}, {pending.lng.toFixed(4)}
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  <Input
                    type="text"
                    placeholder="Location name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                  <Textarea
                    placeholder="Notes for the group"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={handleSaveLocation} disabled={!canEdit || saving}>
                      {saving ? "Saving..." : "Add to trip"}
                    </Button>
                    <Button variant="outline" onClick={() => setPending(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Select a spot on the map to add it here.</p>
            )}

            <div className="flex flex-col gap-3">
              {locations.map((location) => (
                <Card key={location.id} className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm font-semibold">{location.name}</strong>
                    <Badge variant="outline">
                      {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
                    </Badge>
                  </div>
                  {location.note ? (
                    <p className="mt-2 text-sm text-muted-foreground">{location.note}</p>
                  ) : null}
                  {location.address ? (
                    <p className="text-sm text-muted-foreground">{location.address}</p>
                  ) : null}
                </Card>
              ))}
            </div>
          </Card>

          <MapPanel
            locations={locations}
            onSelect={setPending}
            canEdit={canEdit}
            destination={trip.destination}
            destinationPlaceId={trip.destinationPlaceId}
            onDestinationPlaceId={handleDestinationPlaceId}
          />
        </div>
      ) : null}

      {activeTab === "bookings" && tripId ? (
        <TripBookingsTab
          tripId={tripId}
          tripStartDate={tripStart ?? undefined}
          canEdit={canEdit}
          editBookingId={bookingEditId}
          onEditComplete={() => setBookingEditId(null)}
          onAddItem={handleAddBookingItem}
          onUpdateItem={handleUpdateBookingItem}
          onDeleteItem={handleDeleteBookingItem}
        />
      ) : null}

      {activeTab === "expenses" ? (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Expenses</h3>
          <p className="mt-2 text-sm text-muted-foreground">Expense tracking is coming next.</p>
        </Card>
      ) : null}

      {activeTab === "journal" ? (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Journal</h3>
          <p className="mt-2 text-sm text-muted-foreground">Trip journaling is coming next.</p>
        </Card>
      ) : null}
    </div>
  );
};

export default TripPage;
