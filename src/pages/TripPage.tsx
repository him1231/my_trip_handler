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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../lib/auth";
import {
  addItem,
  addLocation,
  addBooking,
  createUnscheduledGroup,
  createDay,
  deleteDay,
  deleteBooking,
  deleteUnscheduledGroup,
  deleteTrip,
  subscribeDays,
  subscribeItinerary,
  subscribeUnscheduledGroups,
  subscribeBookings,
  subscribeLocations,
  subscribeTrip,
  updateTripDestinationPlaceId,
  updateDay,
  updateBooking,
  updateItem,
  updateUnscheduledGroup
} from "../lib/firestore";
import {
  ChecklistItem,
  ItineraryDay as DayType,
  ItineraryItem,
  TimelineEntry,
  Trip,
  TripBooking,
  TripLocation,
  UnscheduledGroup
} from "../lib/types";

type TimelineContentEntry =
  | (TimelineEntry & { kind: "itinerary"; entryId: string; dayKey: string; order?: number })
  | (TimelineEntry & { kind: "booking"; entryId: string; dayKey: string; order?: number });

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
  const [unscheduledGroups, setUnscheduledGroups] = useState<UnscheduledGroup[]>([]);
  const [bookingEditId, setBookingEditId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ lat: number; lng: number; name?: string; address?: string } | null>(
    null
  );
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [openUnscheduledMenuId, setOpenUnscheduledMenuId] = useState<string | null>(null);
  const unscheduledMenuRef = useRef<HTMLDivElement | null>(null);
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
    if (!tripId) {
      setUnscheduledGroups([]);
      return;
    }
    const unsubscribe = subscribeUnscheduledGroups(tripId, setUnscheduledGroups);
    return unsubscribe;
  }, [tripId]);

  useEffect(() => {
    if (pending?.name) {
      setName(pending.name);
    }
  }, [pending]);

  useEffect(() => {
    if (!openUnscheduledMenuId) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!unscheduledMenuRef.current) {
        return;
      }
      if (!unscheduledMenuRef.current.contains(event.target as Node)) {
        setOpenUnscheduledMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openUnscheduledMenuId]);

  const role = useMemo(() => {
    if (!user || !trip) {
      return null;
    }
    return trip.members?.[user.uid]?.role ?? null;
  }, [trip, user]);

  const canEdit = role === "owner" || role === "editor";
  const isOwner = role === "owner";

  useEffect(() => {
    if (!tripId || !canEdit) {
      return;
    }
    if (unscheduledGroups.length > 0) {
      return;
    }
    createUnscheduledGroup(tripId, {
      title: "Unscheduled",
      order: 0,
      isDefault: true
    }).catch((error) => {
      console.error("Failed to create default unscheduled header", error);
    });
  }, [tripId, canEdit, unscheduledGroups.length]);

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

  const dayByKey = useMemo(() => {
    const map = new Map<string, DayType>();
    days.forEach((day) => {
      map.set(toDayKey(day.date), day);
    });
    return map;
  }, [days]);

  const unscheduledGroupById = useMemo(() => {
    const map = new Map<string, UnscheduledGroup>();
    unscheduledGroups.forEach((group) => {
      map.set(group.id, group);
    });
    return map;
  }, [unscheduledGroups]);

  const defaultUnscheduledGroup = useMemo(
    () => unscheduledGroups.find((group) => group.isDefault) ?? unscheduledGroups[0] ?? null,
    [unscheduledGroups]
  );

  const buildSectionKey = (groupId: string) => `unscheduled:${groupId}`;
  const isUnscheduledSectionKey = (key: string) => key.startsWith("unscheduled:");
  const parseUnscheduledGroupId = (key: string) => key.replace("unscheduled:", "");

  const timelineEntries = useMemo(() => {
    const entries: TimelineContentEntry[] = [];

    const resolveItemSectionKey = (item: ItineraryItem) => {
      if (item.dayKey) {
        return item.dayKey;
      }
      if (item.unscheduledGroupId) {
        if (unscheduledGroupById.has(item.unscheduledGroupId)) {
          return buildSectionKey(item.unscheduledGroupId);
        }
        if (defaultUnscheduledGroup) {
          return buildSectionKey(defaultUnscheduledGroup.id);
        }
        return buildSectionKey(item.unscheduledGroupId);
      }
      if (item.date) {
        return toDayKey(item.date);
      }
      return toDayKey(new Date());
    };

    const resolveBookingSectionKey = (booking: TripBooking) => {
      if (booking.dayKey) {
        return booking.dayKey;
      }
      if (booking.unscheduledGroupId) {
        if (unscheduledGroupById.has(booking.unscheduledGroupId)) {
          return buildSectionKey(booking.unscheduledGroupId);
        }
        if (defaultUnscheduledGroup) {
          return buildSectionKey(defaultUnscheduledGroup.id);
        }
        return buildSectionKey(booking.unscheduledGroupId);
      }
      return toDayKey(booking.date);
    };

    itineraryItems.forEach((item) => {
      const dayKey = resolveItemSectionKey(item);
      entries.push({
        kind: "itinerary",
        item,
        entryId: `itinerary:${item.id}`,
        dayKey,
        order: item.order
      });
    });

    bookings.forEach((booking) => {
      const dayKey = resolveBookingSectionKey(booking);
      entries.push({
        kind: "booking",
        booking,
        entryId: `booking:${booking.id}`,
        dayKey,
        order: booking.order
      });
    });

    return entries;
  }, [bookings, buildSectionKey, defaultUnscheduledGroup, itineraryItems, unscheduledGroupById]);

  const entriesBySection = useMemo(() => {
    const grouped = new Map<string, TimelineContentEntry[]>();
    days.forEach((day) => {
      grouped.set(toDayKey(day.date), []);
    });
    unscheduledGroups.forEach((group) => {
      grouped.set(buildSectionKey(group.id), []);
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
          : a.item.startTime?.getTime() ?? new Date(a.item.date ?? Date.now()).setHours(0, 0, 0, 0);
        const timeB = b.kind === "booking"
          ? b.booking.startTime?.getTime() ?? new Date(b.booking.date).setHours(0, 0, 0, 0)
          : b.item.startTime?.getTime() ?? new Date(b.item.date ?? Date.now()).setHours(0, 0, 0, 0);
        return timeA - timeB;
      });
    });

    return grouped;
  }, [buildSectionKey, days, timelineEntries, unscheduledGroups]);

  const unscheduledCounts = useMemo(() => {
    const counts = new Map<string, number>();
    timelineEntries.forEach((entry) => {
      if (!isUnscheduledSectionKey(entry.dayKey)) {
        return;
      }
      const groupId = parseUnscheduledGroupId(entry.dayKey);
      counts.set(groupId, (counts.get(groupId) ?? 0) + 1);
    });
    return counts;
  }, [timelineEntries]);

  const flatTimeline = useMemo(() => {
    const flattened: Array<TimelineEntry & { entryId: string; dayKey: string }> = [];
    days.forEach((day) => {
      const dayKey = toDayKey(day.date);
      flattened.push({
        kind: "day",
        day: day,
        dayKey,
        entryId: `day:${dayKey}`
      });
      (entriesBySection.get(dayKey) ?? []).forEach((entry) => flattened.push(entry));
    });

    if (unscheduledGroups.length) {
      flattened.push({
        kind: "separator",
        label: "Unscheduled",
        dayKey: "separator:unscheduled",
        entryId: "separator:unscheduled"
      });
    }

    unscheduledGroups.forEach((group) => {
      const groupKey = buildSectionKey(group.id);
      flattened.push({
        kind: "group",
        group,
        dayKey: groupKey,
        entryId: `group:${group.id}`
      });
      (entriesBySection.get(groupKey) ?? []).forEach((entry) => flattened.push(entry));
    });

    return flattened;
  }, [buildSectionKey, days, entriesBySection, unscheduledGroups]);

  const sortableEntryIds = useMemo(() => flatTimeline.map((entry) => entry.entryId), [flatTimeline]);

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
    const confirmed = window.confirm("Delete this day? Items will move to the default unscheduled header.");
    if (!confirmed) {
      return;
    }
    const day = days.find((entry) => entry.id === dayId);
    if (!day) {
      return;
    }
    let groupId = defaultUnscheduledGroup?.id ?? null;
    if (!groupId) {
      groupId = await createUnscheduledGroup(tripId, {
        title: "Unscheduled",
        order: unscheduledGroups.length,
        isDefault: true
      });
    }
    const dayKey = toDayKey(day.date);
    const itemsToMove = itineraryItems.filter((item) => {
      const key = item.dayKey ?? (item.date ? toDayKey(item.date) : null);
      return key === dayKey;
    });
    const bookingsToMove = bookings.filter((booking) => {
      const key = booking.dayKey ?? toDayKey(booking.date);
      return key === dayKey;
    });

    await Promise.all([
      ...itemsToMove.map((item) =>
        updateItem(tripId, item.id, {
          dayKey: null,
          unscheduledGroupId: groupId,
          order: item.order
        })
      ),
      ...bookingsToMove.map((booking) =>
        updateBooking(tripId, booking.id, {
          dayKey: null,
          unscheduledGroupId: groupId,
          order: booking.order
        })
      )
    ]);

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
      unscheduledGroupId: null,
      order: buildOrder(day.date, payload.startTime),
      createdBy: user.uid
    });
  };

  const handleAddUnscheduledItem = async (
    group: UnscheduledGroup,
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
    await addItem(tripId, {
      ...payload,
      dayKey: null,
      date: payload.startTime ? payload.startTime : new Date(),
      unscheduledGroupId: group.id,
      order: payload.startTime ? buildOrder(new Date(), payload.startTime) : Date.now(),
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
      unscheduledGroupId: null,
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
      dayKey: toDayKey(payload.date),
      unscheduledGroupId: null
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

  const handleUpdateItem = async (
    entry: TimelineEntry & { entryId: string; dayKey: string },
    itemId: string,
    payload: {
      title: string;
      type: ItineraryItem["type"];
      note?: string;
      startTime?: Date;
      details?: ItineraryItem["details"];
    }
  ) => {
    if (!tripId) {
      return;
    }
    const isUnscheduled = isUnscheduledSectionKey(entry.dayKey);
    const targetDay = dayByKey.get(entry.dayKey);
    const nextDate = isUnscheduled ? (entry.kind === "itinerary" ? entry.item.date ?? new Date() : new Date()) : targetDay?.date;
    if (!nextDate) {
      return;
    }
    await updateItem(tripId, itemId, {
      title: payload.title,
      type: payload.type,
      note: payload.note,
      startTime: payload.startTime,
      details: payload.details,
      dayKey: isUnscheduled ? null : entry.dayKey,
      date: nextDate,
      unscheduledGroupId: isUnscheduled ? parseUnscheduledGroupId(entry.dayKey) : null,
      order: buildOrder(nextDate, payload.startTime)
    });
  };

  const handleCreateUnscheduledGroup = async (title: string) => {
    if (!tripId || !canEdit) {
      return;
    }
    const nextOrder = unscheduledGroups.reduce((max, group) => Math.max(max, group.order ?? 0), -1) + 1;
    await createUnscheduledGroup(tripId, {
      title,
      order: nextOrder,
      isDefault: false
    });
  };

  const handleDeleteUnscheduledGroup = async (group: UnscheduledGroup) => {
    if (!tripId || !canEdit) {
      return;
    }
    if (group.isDefault) {
      window.alert("Default header cannot be deleted.");
      return;
    }
    const confirmed = window.confirm(`Delete “${group.title}” and move its items to the default header?`);
    if (!confirmed) {
      return;
    }

    let targetGroupId = defaultUnscheduledGroup?.id ?? null;
    if (!targetGroupId) {
      targetGroupId = await createUnscheduledGroup(tripId, {
        title: "Unscheduled",
        order: unscheduledGroups.length,
        isDefault: true
      });
    }

    const itemsToMove = itineraryItems.filter((item) => item.unscheduledGroupId === group.id);
    const bookingsToMove = bookings.filter((booking) => booking.unscheduledGroupId === group.id);

    await Promise.all([
      ...itemsToMove.map((item) =>
        updateItem(tripId, item.id, {
          dayKey: null,
          unscheduledGroupId: targetGroupId,
          order: item.order
        })
      ),
      ...bookingsToMove.map((booking) =>
        updateBooking(tripId, booking.id, {
          dayKey: null,
          unscheduledGroupId: targetGroupId,
          order: booking.order
        })
      )
    ]);

    await deleteUnscheduledGroup(tripId, group.id);
  };

  const handleUpdateDayDetails = async (day: DayType, payload: { date: Date; note?: string }) => {
    if (!tripId || !canEdit) {
      return;
    }
    const nextDate = new Date(payload.date);
    nextDate.setHours(0, 0, 0, 0);
    const prevDayKey = toDayKey(day.date);
    const nextDayKey = toDayKey(nextDate);

    await updateDay(tripId, day.id, {
      date: nextDate,
      note: payload.note?.trim() || undefined
    });

    if (prevDayKey === nextDayKey) {
      return;
    }

    const itemsToMove = itineraryItems.filter((item) => {
      if (item.dayKey) {
        return item.dayKey === prevDayKey;
      }
      if (item.unscheduledGroupId) {
        return false;
      }
      const key = item.date ? toDayKey(item.date) : null;
      return key === prevDayKey;
    });
    const bookingsToMove = bookings.filter((booking) => {
      if (booking.dayKey) {
        return booking.dayKey === prevDayKey;
      }
      if (booking.unscheduledGroupId) {
        return false;
      }
      const key = toDayKey(booking.date);
      return key === prevDayKey;
    });

    await Promise.all([
      ...itemsToMove.map((item) =>
        updateItem(tripId, item.id, {
          dayKey: nextDayKey,
          date: nextDate,
          unscheduledGroupId: null,
          startTime: applyDayToTime(nextDate, item.startTime)
        })
      ),
      ...bookingsToMove.map((booking) =>
        updateBooking(tripId, booking.id, {
          dayKey: nextDayKey,
          date: nextDate,
          unscheduledGroupId: null,
          startTime: applyDayToTime(nextDate, booking.startTime)
        })
      )
    ]);
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

  const persistOrderForSection = async (sectionKey: string, entryIds: string[]) => {
    if (!tripId) {
      return;
    }
    await Promise.all(
      entryIds.map((entryId, index) => {
        const entry = entryById.get(entryId);
        if (!entry || entry.kind === "day" || entry.kind === "group" || entry.kind === "separator") {
          return Promise.resolve();
        }
        if (entry.kind === "itinerary") {
          return updateItem(tripId, entry.item.id, { order: index });
        }
        return updateBooking(tripId, entry.booking.id, { order: index });
      })
    );
  };

  const updateEntrySection = async (entryId: string, targetSectionKey: string) => {
    if (!tripId) {
      return;
    }
    const entry = entryById.get(entryId);
    if (!entry) {
      return;
    }
    if (isUnscheduledSectionKey(targetSectionKey)) {
      const groupId = parseUnscheduledGroupId(targetSectionKey);
      if (entry.kind === "itinerary") {
        await updateItem(tripId, entry.item.id, {
          dayKey: null,
          unscheduledGroupId: groupId,
          date: entry.item.date ?? new Date()
        });
      } else if (entry.kind === "booking") {
        await updateBooking(tripId, entry.booking.id, {
          dayKey: null,
          unscheduledGroupId: groupId,
          date: entry.booking.date
        });
      }
      return;
    }

    const targetDay = dayByKey.get(targetSectionKey);
    if (!targetDay) {
      return;
    }
    if (entry.kind === "itinerary") {
      await updateItem(tripId, entry.item.id, {
        dayKey: targetSectionKey,
        date: targetDay.date,
        unscheduledGroupId: null,
        startTime: applyDayToTime(targetDay.date, entry.item.startTime)
      });
    } else if (entry.kind === "booking") {
      await updateBooking(tripId, entry.booking.id, {
        dayKey: targetSectionKey,
        date: targetDay.date,
        unscheduledGroupId: null,
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
    if (!activeEntry || activeEntry.kind === "day" || activeEntry.kind === "group" || activeEntry.kind === "separator") {
      if (!activeEntry || activeEntry?.kind !== "group") {
        return;
      }

      const groupHeaderIds = flatTimeline
        .filter((entry) => entry.kind === "group")
        .map((entry) => entry.entryId);
      const fromIndex = groupHeaderIds.indexOf(activeId);
      if (fromIndex === -1) {
        return;
      }

      const overEntry = entryById.get(overId);
      const overGroupId = overId.startsWith("group:")
        ? overId.replace("group:", "")
        : overEntry && (overEntry.kind === "itinerary" || overEntry.kind === "booking")
          ? (isUnscheduledSectionKey(overEntry.dayKey) ? parseUnscheduledGroupId(overEntry.dayKey) : null)
          : null;
      if (!overGroupId) {
        return;
      }
      const toIndex = groupHeaderIds.indexOf(`group:${overGroupId}`);
      if (toIndex === -1 || fromIndex === toIndex) {
        return;
      }
      const nextGroupOrderIds = arrayMove(groupHeaderIds, fromIndex, toIndex);
      await Promise.all(
        nextGroupOrderIds.map((entryId, index) =>
          updateUnscheduledGroup(tripId!, entryId.replace("group:", ""), { order: index })
        )
      );
      return;
    }
    const fromDayKey = activeEntry.dayKey;
    const activeIndex = sortableEntryIds.indexOf(activeId);
    const overIndex = sortableEntryIds.indexOf(overId);
    if (activeIndex === -1 || overIndex === -1) {
      return;
    }

    const isHeaderId = (id: string) => id.startsWith("day:") || id.startsWith("group:") || id.startsWith("separator:");
    const sectionKeyFromHeaderId = (id: string) => {
      if (id.startsWith("day:")) {
        return id.replace("day:", "");
      }
      if (id.startsWith("group:")) {
        return buildSectionKey(id.replace("group:", ""));
      }
      if (id.startsWith("separator:")) {
        return defaultUnscheduledGroup ? buildSectionKey(defaultUnscheduledGroup.id) : null;
      }
      return null;
    };

    const isHeaderDrop = isHeaderId(overId);
    const isAboveHeader = isHeaderDrop ? activeIndex > overIndex : false;

    const findPreviousHeaderIndex = (ids: string[], index: number) => {
      for (let i = index; i >= 0; i -= 1) {
        if (isHeaderId(ids[i])) {
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

    const findTargetSectionKey = (ids: string[], index: number) => {
      for (let i = index; i >= 0; i -= 1) {
        const id = ids[i];
        if (isHeaderId(id)) {
          return sectionKeyFromHeaderId(id);
        }
      }
      const firstHeader = ids.find((id) => isHeaderId(id));
      return firstHeader ? sectionKeyFromHeaderId(firstHeader) : null;
    };

    const targetSectionKey = isHeaderDrop
      ? isAboveHeader
        ? (() => {
          const headerIndex = nextFlatIds.indexOf(overId);
          const previousHeaderIndex = findPreviousHeaderIndex(nextFlatIds, headerIndex - 1);
          const prevHeaderId = previousHeaderIndex >= 0 ? nextFlatIds[previousHeaderIndex] : null;
          return prevHeaderId ? sectionKeyFromHeaderId(prevHeaderId) : findTargetSectionKey(nextFlatIds, headerIndex);
        })()
        : sectionKeyFromHeaderId(overId)
      : findTargetSectionKey(nextFlatIds, overIndex);
    if (!targetSectionKey) {
      return;
    }

    const nextSectionOrders = new Map<string, string[]>();
    let currentSectionKey: string | null = null;
    nextFlatIds.forEach((id) => {
      if (isHeaderId(id)) {
        currentSectionKey = sectionKeyFromHeaderId(id);
        if (currentSectionKey && !nextSectionOrders.has(currentSectionKey)) {
          nextSectionOrders.set(currentSectionKey, []);
        }
        return;
      }
      if (currentSectionKey) {
        nextSectionOrders.get(currentSectionKey)?.push(id);
      }
    });

    const nextFrom = nextSectionOrders.get(fromDayKey) ?? [];
    const nextTo = nextSectionOrders.get(targetSectionKey) ?? [];

    if (fromDayKey === targetSectionKey) {
      await persistOrderForSection(fromDayKey, nextFrom);
      return;
    }

    await updateEntrySection(activeId, targetSectionKey);
    await Promise.all([
      persistOrderForSection(fromDayKey, nextFrom),
      persistOrderForSection(targetSectionKey, nextTo)
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
          <div className="flex flex-col gap-6">
            <DaySelector
              days={days}
              selectedDayId={selectedDayId}
              onSelect={handleSelectDay}
              onAdd={handleAddDay}
              onDelete={handleDeleteDay}
              canEdit={canEdit}
            />
            <Card className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Unscheduled headers</h3>
                  <p className="text-sm text-muted-foreground">
                    Group items without a day so you can schedule them later.
                  </p>
                </div>
                <Dialog
                  open={groupDialogOpen}
                  onOpenChange={(open) => {
                    setGroupDialogOpen(open);
                    if (!open) {
                      setNewGroupName("");
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" disabled={!canEdit}>
                      Add header
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New header</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 flex flex-col gap-3">
                      <div>
                        <Label>Name</Label>
                        <Input
                          type="text"
                          placeholder="Eat, Go, Shopping"
                          value={newGroupName}
                          onChange={(event) => setNewGroupName(event.target.value)}
                        />
                      </div>
                      <Button
                        onClick={async () => {
                          if (!newGroupName.trim()) {
                            return;
                          }
                          setCreatingGroup(true);
                          try {
                            await handleCreateUnscheduledGroup(newGroupName.trim());
                            setNewGroupName("");
                            setGroupDialogOpen(false);
                          } finally {
                            setCreatingGroup(false);
                          }
                        }}
                        disabled={!canEdit || !newGroupName.trim() || creatingGroup}
                      >
                        {creatingGroup ? "Adding..." : "Add header"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-col gap-2">
                {unscheduledGroups.map((group) => {
                  const count = unscheduledCounts.get(group.id) ?? 0;
                  return (
                    <div
                      key={group.id}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{group.title}</span>
                        {group.isDefault ? (
                          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                            Default
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{count} item{count === 1 ? "" : "s"}</span>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!canEdit || group.isDefault}
                            className="h-7 w-7 p-0"
                            onClick={() =>
                              setOpenUnscheduledMenuId((prev) => (prev === group.id ? null : group.id))
                            }
                            aria-label="Open menu"
                          >
                            ⋯
                          </Button>
                          {openUnscheduledMenuId === group.id ? (
                            <div
                              ref={unscheduledMenuRef}
                              className="absolute right-0 top-full z-10 mt-2 w-32 rounded-md border bg-white shadow"
                            >
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-100"
                                onClick={() => {
                                  setOpenUnscheduledMenuId(null);
                                  handleDeleteUnscheduledGroup(group);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!unscheduledGroups.length ? (
                  <p className="text-sm text-muted-foreground">No headers yet. Add the first header.</p>
                ) : null}
              </div>
            </Card>
          </div>
          <DndContext
            onDragEnd={handleDragEnd}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
          >
            {days.length || unscheduledGroups.length ? (
              <ItineraryTimeline
                entries={flatTimeline}
                sortableEntryIds={sortableEntryIds}
                dayByKey={dayByKey}
                canEdit={canEdit}
                onAddItem={handleAddItem}
                onAddUnscheduledItem={handleAddUnscheduledItem}
                onUpdateItemEntry={handleUpdateItem}
                onUpdateDay={handleUpdateDayDetails}
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
