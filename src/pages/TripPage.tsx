import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLayoutHeader } from "../components/Layout";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  type CollisionDetection
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DaySelector from "../components/DaySelector";
import ShareDialog from "../components/ShareDialog";
import ItineraryTimeline from "../components/ItineraryTimeline";
import MapPanel from "../components/MapPanel";
import TabButton from "../components/TabButton";
import TripBookingsTab from "../components/TripBookingsTab";
import TripInfoPanel, { type TripInfoStat, type TripInfoTimelineGroup } from "../components/TripInfoPanel";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/ui/select";
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
  deleteItem,
  deleteLocation,
  deleteUnscheduledGroup,
  deleteTrip,
  subscribeDays,
  subscribeItinerary,
  subscribeUnscheduledGroups,
  subscribeBookings,
  subscribeLocations,
  subscribeTrip,
  updateLocation,
  updateTripCoverImageUrl,
  updateTripDetails,
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

const MapHeader = ({ id, children }: { id: string; children: ReactNode }) => {
  const { setNodeRef, isOver, transform, transition } = useSortable({ id, disabled: true });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isOver ? "rounded-lg bg-muted/40 p-2" : "p-2"}
    >
      {children}
    </div>
  );
};

const MapSortableItem = ({
  id,
  children
}: {
  id: string;
  children: (dragHandleProps: Record<string, unknown>) => ReactNode;
}) => {
  const { setNodeRef, transform, transition, isDragging, listeners, attributes } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-70" : undefined}
    >
      {children({ ...listeners, ...attributes })}
    </div>
  );
};

const formatMapDayLabel = (day: DayType) =>
  `Day ${day.dayNumber} · ${day.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

const TripPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setHeaderContent } = useLayoutHeader();
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
  const [activeTab, setActiveTab] = useState<"itinerary" | "bookings" | "map" | "expenses" | "journal" | "info">("itinerary");
  const [mapFilterSelections, setMapFilterSelections] = useState<string[]>([]);
  const [mapFilterTouched, setMapFilterTouched] = useState(false);
  const [showSavedLocations, setShowSavedLocations] = useState(true);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingLocationName, setEditingLocationName] = useState("");
  const [editingLocationAddress, setEditingLocationAddress] = useState("");
  const [editingLocationNote, setEditingLocationNote] = useState("");
  const [savingLocationEdit, setSavingLocationEdit] = useState(false);
  const [selectedSavedLocationId, setSelectedSavedLocationId] = useState<string | null>(null);
  const [openLocationMenuId, setOpenLocationMenuId] = useState<string | null>(null);
  const locationMenuRef = useRef<HTMLDivElement | null>(null);
  const [assignLocationId, setAssignLocationId] = useState<string | null>(null);
  const [assignSectionKey, setAssignSectionKey] = useState<string>("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [activeMapDragId, setActiveMapDragId] = useState<string | null>(null);
  const [openMapItemMenuId, setOpenMapItemMenuId] = useState<string | null>(null);
  const mapItemMenuRef = useRef<HTMLDivElement | null>(null);
  const [mapEditItemId, setMapEditItemId] = useState<string | null>(null);
  const [selectedMapItemId, setSelectedMapItemId] = useState<string | null>(null);
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  const handleSelectSavedLocation = (location: TripLocation) => {
    setSelectedSavedLocationId(location.id);
    setPending(null);
  };

  const handleOpenAssignDialog = (location: TripLocation) => {
    setAssignLocationId(location.id);
    setAssignSectionKey(mapSectionOptions[0]?.value ?? "");
    setAssignDialogOpen(true);
  };

  const handleAssignLocationToSection = async () => {
    if (!tripId || !assignLocationId || !assignSectionKey || !canEdit) {
      return;
    }
    const location = locationById.get(assignLocationId);
    if (!location) {
      return;
    }
    const existingItem = itineraryItems.find((item) => item.locationId === location.id);

    if (isUnscheduledSectionKey(assignSectionKey)) {
      const groupId = parseUnscheduledGroupId(assignSectionKey);
      if (existingItem) {
        await updateItem(tripId, existingItem.id, {
          dayKey: null,
          unscheduledGroupId: groupId,
          date: existingItem.date ?? new Date()
        });
      } else {
        await addItem(tripId, {
          title: location.name,
          type: "activity",
          locationId: location.id,
          dayKey: null,
          unscheduledGroupId: groupId,
          date: new Date(),
          createdBy: user?.uid ?? "unknown"
        });
      }
    } else {
      const targetDay = dayByKey.get(assignSectionKey);
      if (!targetDay) {
        return;
      }
      if (existingItem) {
        await updateItem(tripId, existingItem.id, {
          dayKey: assignSectionKey,
          unscheduledGroupId: null,
          date: targetDay.date,
          startTime: applyDayToTime(targetDay.date, existingItem.startTime)
        });
      } else {
        await addItem(tripId, {
          title: location.name,
          type: "activity",
          locationId: location.id,
          dayKey: assignSectionKey,
          unscheduledGroupId: null,
          date: targetDay.date,
          createdBy: user?.uid ?? "unknown"
        });
      }
    }

    setAssignDialogOpen(false);
    setAssignLocationId(null);
  };

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

  const findSavedLocationMatch = useCallback(
    (selection: { lat: number; lng: number }) => {
      const tolerance = 0.0001;
      return (
        locations.find(
          (location) =>
            Math.abs(location.lat - selection.lat) < tolerance &&
            Math.abs(location.lng - selection.lng) < tolerance
        ) ?? null
      );
    },
    [locations]
  );

  useEffect(() => {
    if (!pending) {
      return;
    }
    const match = findSavedLocationMatch(pending);
    if (!match) {
      setSelectedSavedLocationId(null);
      return;
    }
    setSelectedSavedLocationId(match.id);
    setPending(null);
  }, [findSavedLocationMatch, pending]);

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

  useEffect(() => {
    if (!openLocationMenuId) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!locationMenuRef.current) {
        return;
      }
      if (!locationMenuRef.current.contains(event.target as Node)) {
        setOpenLocationMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openLocationMenuId]);

  useEffect(() => {
    if (!openMapItemMenuId) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!mapItemMenuRef.current) {
        return;
      }
      if (!mapItemMenuRef.current.contains(event.target as Node)) {
        setOpenMapItemMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMapItemMenuId]);

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

  const resolveItemSectionKey = useCallback(
    (item: ItineraryItem) => {
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
    },
    [buildSectionKey, defaultUnscheduledGroup, toDayKey, unscheduledGroupById]
  );

  const timelineEntries = useMemo(() => {
    const entries: TimelineContentEntry[] = [];

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
  }, [bookings, buildSectionKey, defaultUnscheduledGroup, itineraryItems, resolveItemSectionKey, unscheduledGroupById]);

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

  const unscheduledItemCount = useMemo(
    () => timelineEntries.reduce((total, entry) => (isUnscheduledSectionKey(entry.dayKey) ? total + 1 : total), 0),
    [isUnscheduledSectionKey, timelineEntries]
  );

  const tripStats = useMemo<TripInfoStat[]>(
    () => [
      { label: "Items", value: itineraryItems.length },
      { label: "Bookings", value: bookings.length },
      { label: "Locations", value: locations.length },
      { label: "Days", value: days.length },
      { label: "Unscheduled items", value: unscheduledItemCount },
      { label: "Unscheduled groups", value: unscheduledGroups.length }
    ],
    [bookings.length, days.length, itineraryItems.length, locations.length, unscheduledGroups.length, unscheduledItemCount]
  );

  const timelineGroups = useMemo<TripInfoTimelineGroup[]>(() => {
    const groups: TripInfoTimelineGroup[] = [];
    const formatEntry = (entry: TimelineContentEntry) => {
      const time = entry.kind === "booking" ? entry.booking.startTime : entry.item.startTime;
      const dateValue = entry.kind === "booking" ? entry.booking.date : entry.item.date;
      const timeValue = (time ?? dateValue)?.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit"
      });
      const typeLabel = entry.kind === "booking" ? entry.booking.type : entry.item.type;
      return {
        id: entry.entryId,
        title: entry.kind === "booking" ? entry.booking.title : entry.item.title,
        meta: [typeLabel, timeValue].filter(Boolean).join(" · ")
      };
    };

    days.forEach((day) => {
      const dayKey = toDayKey(day.date);
      const entries = entriesBySection.get(dayKey) ?? [];
      groups.push({
        id: dayKey,
        label: `Day ${day.dayNumber} · ${day.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
        entries: entries.map(formatEntry)
      });
    });

    unscheduledGroups.forEach((group) => {
      const sectionKey = buildSectionKey(group.id);
      const entries = entriesBySection.get(sectionKey) ?? [];
      groups.push({
        id: sectionKey,
        label: group.title,
        entries: entries.map(formatEntry),
        isUnscheduled: true
      });
    });

    return groups;
  }, [buildSectionKey, days, entriesBySection, toDayKey, unscheduledGroups]);

  const locationById = useMemo(() => {
    const map = new Map<string, TripLocation>();
    locations.forEach((location) => {
      map.set(location.id, location);
    });
    return map;
  }, [locations]);

  const mapSectionOptions = useMemo(
    () => [
      ...days.map((day) => ({ value: toDayKey(day.date), label: formatMapDayLabel(day) })),
      ...unscheduledGroups.map((group) => ({ value: buildSectionKey(group.id), label: group.title }))
    ],
    [buildSectionKey, days, toDayKey, unscheduledGroups]
  );

  const dayColorFallbacks = ["#2563eb", "#0ea5e9", "#14b8a6", "#10b981", "#f59e0b", "#f97316", "#ef4444", "#8b5cf6"];
  const groupColorFallbacks = ["#7c3aed", "#a855f7", "#ec4899", "#f43f5e", "#f97316", "#f59e0b", "#22c55e"];

  const dayColorByKey = useMemo(() => {
    const map = new Map<string, string>();
    days.forEach((day, index) => {
      map.set(toDayKey(day.date), day.color ?? dayColorFallbacks[index % dayColorFallbacks.length]);
    });
    return map;
  }, [days, dayColorFallbacks, toDayKey]);

  const groupColorById = useMemo(() => {
    const map = new Map<string, string>();
    unscheduledGroups.forEach((group, index) => {
      map.set(group.id, group.color ?? groupColorFallbacks[index % groupColorFallbacks.length]);
    });
    return map;
  }, [groupColorFallbacks, unscheduledGroups]);

  const mapSectionKeys = useMemo(
    () => mapSectionOptions.map((option) => option.value),
    [mapSectionOptions]
  );

  useEffect(() => {
    if (mapFilterTouched) {
      return;
    }
    setMapFilterSelections((prev) => {
      if (prev.length === mapSectionKeys.length && prev.every((value, index) => value === mapSectionKeys[index])) {
        return prev;
      }
      return mapSectionKeys;
    });
  }, [mapFilterTouched, mapSectionKeys]);

  const mapItemsBySection = useMemo(() => {
    const grouped = new Map<string, ItineraryItem[]>();
    days.forEach((day) => {
      grouped.set(toDayKey(day.date), []);
    });
    unscheduledGroups.forEach((group) => {
      grouped.set(buildSectionKey(group.id), []);
    });

    itineraryItems.forEach((item) => {
      if (!item.locationId) {
        return;
      }
      if (!locationById.has(item.locationId)) {
        return;
      }
      const sectionKey = resolveItemSectionKey(item);
      if (!grouped.has(sectionKey)) {
        grouped.set(sectionKey, []);
      }
      grouped.get(sectionKey)?.push(item);
    });

    grouped.forEach((items) => {
      items.sort((a, b) => {
        const orderA = a.order;
        const orderB = b.order;
        if (orderA !== undefined || orderB !== undefined) {
          if (orderA === undefined) return 1;
          if (orderB === undefined) return -1;
          return orderA - orderB;
        }
        const timeA = a.startTime?.getTime() ?? new Date(a.date ?? Date.now()).setHours(0, 0, 0, 0);
        const timeB = b.startTime?.getTime() ?? new Date(b.date ?? Date.now()).setHours(0, 0, 0, 0);
        return timeA - timeB;
      });
    });

    return grouped;
  }, [buildSectionKey, days, itineraryItems, locationById, resolveItemSectionKey, toDayKey, unscheduledGroups]);

  const mapSelectedSectionSet = useMemo(
    () => new Set(mapFilterSelections),
    [mapFilterSelections]
  );

  const mapSelectedItemsBySection = useMemo(() => {
    const selected = new Map<string, ItineraryItem[]>();
    mapItemsBySection.forEach((items, sectionKey) => {
      if (mapSelectedSectionSet.has(sectionKey)) {
        selected.set(sectionKey, items);
      }
    });
    return selected;
  }, [mapItemsBySection, mapSelectedSectionSet]);

  const mapSelectedItems = useMemo(
    () => Array.from(mapSelectedItemsBySection.values()).flat(),
    [mapSelectedItemsBySection]
  );

  const mapItemSectionById = useMemo(() => {
    const map = new Map<string, string>();
    mapSelectedItemsBySection.forEach((items, sectionKey) => {
      items.forEach((item) => map.set(item.id, sectionKey));
    });
    return map;
  }, [mapSelectedItemsBySection]);

  const mapFlatList = useMemo(() => {
    const entries: Array<{ type: "header"; sectionKey: string } | { type: "item"; sectionKey: string; item: ItineraryItem }> = [];
    mapSelectedItemsBySection.forEach((items, sectionKey) => {
      entries.push({ type: "header", sectionKey });
      items.forEach((item) => entries.push({ type: "item", sectionKey, item }));
    });
    return entries;
  }, [mapSelectedItemsBySection]);

  const mapCollisionDetection = useMemo<CollisionDetection>(
    () => (args) => {
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) {
        return pointerCollisions;
      }
      return rectIntersection(args);
    },
    []
  );

  const mapSortableIds = useMemo(
    () =>
      mapFlatList.map((entry) =>
        entry.type === "header" ? `map-header:${entry.sectionKey}` : `map-item:${entry.item.id}`
      ),
    [mapFlatList]
  );

  const resolveSectionLabel = useCallback(
    (sectionKey: string) => {
      if (isUnscheduledSectionKey(sectionKey)) {
        const groupId = parseUnscheduledGroupId(sectionKey);
        return unscheduledGroupById.get(groupId)?.title ?? "Unscheduled";
      }
      const day = dayByKey.get(sectionKey);
      return day ? formatMapDayLabel(day) : sectionKey;
    },
    [dayByKey, unscheduledGroupById]
  );

  const handleMapDragEnd = async (event: DragEndEvent) => {
    if (!canEdit || !tripId) {
      return;
    }
    const { active, over } = event;
    if (!over) {
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith("map-item:")) {
      return;
    }
    const activeItemId = activeId.replace("map-item:", "");
    const fromSectionKey = mapItemSectionById.get(activeItemId);
    if (!fromSectionKey) {
      return;
    }

    const isHeaderId = (id: string) => id.startsWith("map-header:");
    const sectionKeyFromHeaderId = (id: string) => id.replace("map-header:", "");

    const activeIndex = mapSortableIds.indexOf(activeId);
    const overIndex = mapSortableIds.indexOf(overId);
    if (activeIndex === -1 || overIndex === -1) {
      return;
    }

    const isHeaderDrop = isHeaderId(overId);
    const isAboveHeader = isHeaderDrop ? activeIndex > overIndex : false;

    const buildNextFlatIds = () => {
      if (!isHeaderDrop) {
        return arrayMove(mapSortableIds, activeIndex, overIndex);
      }
      const updated = [...mapSortableIds];
      const removedIndex = updated.indexOf(activeId);
      if (removedIndex === -1) {
        return null;
      }
      updated.splice(removedIndex, 1);

      const headerIndex = updated.indexOf(overId);
      if (headerIndex === -1) {
        return null;
      }
      const insertAt = isAboveHeader ? headerIndex : headerIndex + 1;
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
          for (let i = headerIndex - 1; i >= 0; i -= 1) {
            const id = nextFlatIds[i];
            if (isHeaderId(id)) {
              return sectionKeyFromHeaderId(id);
            }
          }
          return findTargetSectionKey(nextFlatIds, headerIndex);
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
      if (currentSectionKey && id.startsWith("map-item:")) {
        nextSectionOrders.get(currentSectionKey)?.push(id);
      }
    });

    const nextFrom = nextSectionOrders.get(fromSectionKey) ?? [];
    const nextTo = nextSectionOrders.get(targetSectionKey) ?? [];

    if (fromSectionKey === targetSectionKey) {
      await Promise.all(
        nextFrom.map((id, index) => updateItem(tripId, id.replace("map-item:", ""), { order: index }))
      );
      return;
    }

    const activeItem = itineraryItems.find((item) => item.id === activeItemId);
    if (!activeItem) {
      return;
    }

    if (isUnscheduledSectionKey(targetSectionKey)) {
      const groupId = parseUnscheduledGroupId(targetSectionKey);
      await updateItem(tripId, activeItem.id, {
        dayKey: null,
        unscheduledGroupId: groupId,
        date: activeItem.date ?? new Date()
      });
    } else {
      const targetDay = dayByKey.get(targetSectionKey);
      if (!targetDay) {
        return;
      }
      await updateItem(tripId, activeItem.id, {
        dayKey: targetSectionKey,
        date: targetDay.date,
        unscheduledGroupId: null,
        startTime: applyDayToTime(targetDay.date, activeItem.startTime)
      });
    }

    await Promise.all([
      Promise.all(
        nextFrom.map((id, index) => updateItem(tripId, id.replace("map-item:", ""), { order: index }))
      ),
      Promise.all(
        nextTo.map((id, index) => updateItem(tripId, id.replace("map-item:", ""), { order: index }))
      )
    ]);
  };

  const mapMarkers = useMemo(() => {
    const seen = new Set<string>();
    const output: Array<{
      id: string;
      lat: number;
      lng: number;
      name: string;
      address?: string;
      kind: "day" | "group" | "saved";
      color?: string;
    }> = [];

    mapSelectedItemsBySection.forEach((items, sectionKey) => {
      const isGroup = isUnscheduledSectionKey(sectionKey);
      const kind = isGroup ? "group" : "day";
      const color = isGroup
        ? groupColorById.get(parseUnscheduledGroupId(sectionKey))
        : dayColorByKey.get(sectionKey);
      items.forEach((item) => {
        if (!item.locationId) {
          return;
        }
        const location = locationById.get(item.locationId);
        if (!location || seen.has(location.id)) {
          return;
        }
        seen.add(location.id);
        output.push({
          id: location.id,
          lat: location.lat,
          lng: location.lng,
          name: location.name,
          address: location.address,
          kind,
          color
        });
      });
    });

    if (showSavedLocations) {
      locations.forEach((location) => {
        if (seen.has(location.id)) {
          return;
        }
        seen.add(location.id);
        output.push({
          id: location.id,
          lat: location.lat,
          lng: location.lng,
          name: location.name,
          address: location.address,
          kind: "saved"
        });
      });
    }

    return output;
  }, [dayColorByKey, groupColorById, locationById, locations, mapSelectedItemsBySection, showSavedLocations]);
  
  const selectedLocationForMap = useMemo(() => {
    if (selectedSavedLocationId) {
      const saved = locations.find((location) => location.id === selectedSavedLocationId);
      if (saved) {
        return {
          lat: saved.lat,
          lng: saved.lng,
          name: saved.name,
          address: saved.address
        };
      }
    }
    return pending;
  }, [locations, pending, selectedSavedLocationId]);

  useEffect(() => {
    if (!selectedLocationForMap) {
      setSelectedMapItemId(null);
      return;
    }
    const match = mapSelectedItems.find((item) => {
      if (!item.locationId) {
        return false;
      }
      const location = locationById.get(item.locationId);
      if (!location) {
        return false;
      }
      return (
        Math.abs(location.lat - selectedLocationForMap.lat) < 0.0001 &&
        Math.abs(location.lng - selectedLocationForMap.lng) < 0.0001
      );
    });
    setSelectedMapItemId(match?.id ?? null);
  }, [locationById, mapSelectedItems, selectedLocationForMap]);

  const buildLocationQuery = (location: TripLocation) => {
    const address = location.address?.trim();
    if (address) {
      return address;
    }
    const name = location.name?.trim();
    if (name) {
      return name;
    }
    return `${location.lat},${location.lng}`;
  };

  const handleOpenRoute = useCallback((origin: TripLocation, destination: TripLocation) => {
    const originQuery = encodeURIComponent(buildLocationQuery(origin));
    const destinationQuery = encodeURIComponent(buildLocationQuery(destination));
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${destinationQuery}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

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

  const handleStartLocationEdit = (location: TripLocation) => {
    setEditingLocationId(location.id);
    setEditingLocationName(location.name ?? "");
    setEditingLocationAddress(location.address ?? "");
    setEditingLocationNote(location.note ?? "");
  };

  const handleCancelLocationEdit = () => {
    setEditingLocationId(null);
    setEditingLocationName("");
    setEditingLocationAddress("");
    setEditingLocationNote("");
  };

  const handleSaveLocationEdit = async () => {
    if (!tripId || !editingLocationId || !editingLocationName.trim()) {
      return;
    }
    setSavingLocationEdit(true);
    try {
      await updateLocation(tripId, editingLocationId, {
        name: editingLocationName.trim(),
        address: editingLocationAddress.trim() || undefined,
        note: editingLocationNote.trim() || undefined
      });
      handleCancelLocationEdit();
    } finally {
      setSavingLocationEdit(false);
    }
  };

  const handleDeleteLocation = async (location: TripLocation) => {
    if (!tripId || !canEdit) {
      return;
    }
    const confirmed = window.confirm("Delete this location?");
    if (!confirmed) {
      return;
    }
    await deleteLocation(tripId, location.id);
    if (selectedSavedLocationId === location.id) {
      setSelectedSavedLocationId(null);
    }
  };

  const handleEditMapItem = (item: ItineraryItem) => {
    setOpenMapItemMenuId(null);
    setMapEditItemId(item.id);
    setActiveTab("itinerary");
  };

  const handleDeleteMapItem = async (item: ItineraryItem) => {
    if (!tripId || !canEdit) {
      return;
    }
    const confirmed = window.confirm("Delete this itinerary item?");
    if (!confirmed) {
      return;
    }
    await deleteItem(tripId, item.id);
  };

  const handleDestinationPlaceId = useCallback(
    async (placeId: string) => {
      if (!tripId || !canEdit || trip?.destinationPlaceId === placeId) {
        return;
      }
      await updateTripDestinationPlaceId(tripId, placeId);
    },
    [canEdit, trip?.destinationPlaceId, tripId]
  );

  const handleCoverImageUpdate = useCallback(
    async (nextUrl: string | null) => {
      if (!tripId || !canEdit) {
        return;
      }
      if (nextUrl === (trip?.coverImageUrl ?? null)) {
        return;
      }
      await updateTripCoverImageUrl(tripId, nextUrl);
    },
    [canEdit, trip?.coverImageUrl, tripId]
  );

  const handleTripDetailsUpdate = useCallback(
    async (payload: {
      title: string;
      description?: string | null;
      destination?: string | null;
      startDate?: Date | null;
      endDate?: Date | null;
      timezone?: string | null;
    }) => {
      if (!tripId || !canEdit) {
        return;
      }
      await updateTripDetails(tripId, payload);
    },
    [canEdit, tripId]
  );

  const tripStart = trip?.startDate ? new Date(trip.startDate) : null;
  const tripEnd = trip?.endDate ? new Date(trip.endDate) : null;
  const tripDuration =
    tripStart && tripEnd
      ? Math.floor((tripEnd.getTime() - tripStart.getTime()) / 86400000) + 1
      : null;

  const headerContent = useMemo(() => {
    if (!trip) {
      return null;
    }
    return (
      <Card className="w-full px-3 shadow-none border-none bg-transparent">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{trip.title}</h2>

            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Move saved location to day/group</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="assign-section">Choose day or group</Label>
                    <Select value={assignSectionKey} onValueChange={setAssignSectionKey}>
                      <SelectTrigger id="assign-section">
                        <SelectValue placeholder="Select a day or group" />
                      </SelectTrigger>
                      <SelectContent>
                        {mapSectionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleAssignLocationToSection}
                      disabled={!assignLocationId || !assignSectionKey || !canEdit}
                    >
                      Move to itinerary
                    </Button>
                    <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {trip.inviteToken && (role === "owner" || role === "editor") ? (
              <ShareDialog inviteToken={trip.inviteToken} />
            ) : null}
            {isOwner ? (
              <Button variant="outline" size="sm" onClick={handleDeleteTrip}>
                Delete trip
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    );
  }, [
    canEdit,
    handleCoverImageUpdate,
    handleDeleteTrip,
    isOwner,
    role,
    timelineGroups,
    trip,
    tripDuration,
    tripEnd,
    tripStart,
    tripStats
  ]);

  useEffect(() => {
    setHeaderContent(headerContent);
    return () => setHeaderContent(null);
  }, [headerContent, setHeaderContent]);

  if (!tripId) {
    return <p className="text-sm text-muted-foreground">Missing trip id.</p>;
  }

  if (!trip) {
    return <p className="text-sm text-muted-foreground">Loading trip details...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <TabButton label="Trip info" active={activeTab === "info"} onClick={() => setActiveTab("info")} />
        <TabButton label="Itinerary" active={activeTab === "itinerary"} onClick={() => setActiveTab("itinerary")} />
        <TabButton label="Bookings" active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")} />
        <TabButton label="Map" active={activeTab === "map"} onClick={() => setActiveTab("map")} />
        <TabButton label="Expenses" active={activeTab === "expenses"} onClick={() => setActiveTab("expenses")} />
        <TabButton label="Journal" active={activeTab === "journal"} onClick={() => setActiveTab("journal")} />
      </div>

      {activeTab === "info" ? (
        <TripInfoPanel
          trip={trip}
          role={role}
          canEdit={canEdit}
          tripStart={tripStart}
          tripEnd={tripEnd}
          tripDuration={tripDuration}
          stats={tripStats}
          timelineGroups={timelineGroups}
          onSaveCoverImage={handleCoverImageUpdate}
          onSaveTripDetails={handleTripDetailsUpdate}
        />
      ) : null}

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
                externalEditItemId={mapEditItemId}
                onExternalEditHandled={() => setMapEditItemId(null)}
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
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,360px)_1fr] lg:items-stretch">
          <Card className="flex max-h-[calc(100vh-220px)] flex-col gap-4 overflow-hidden py-5 pl-5">
            <div>
              <h3 className="text-lg font-semibold">Locations</h3>
              <p className="text-sm text-muted-foreground">Click the map to add a location.</p>
            </div>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
              <div className="flex flex-col gap-3">
                <Label>Filter itinerary by day or group</Label>
                {mapSectionOptions.length ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMapFilterTouched(true);
                          setMapFilterSelections(mapSectionKeys);
                        }}
                      >
                        Show all
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMapFilterTouched(true);
                          setMapFilterSelections([]);
                        }}
                      >
                        Hide all
                      </Button>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={showSavedLocations}
                        onChange={(event) => setShowSavedLocations(event.target.checked)}
                      />
                      <span>Saved locations</span>
                    </label>
                    {mapSectionOptions.map((option) => (
                      <label key={option.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={mapFilterSelections.includes(option.value)}
                          onChange={(event) => {
                            setMapFilterTouched(true);
                            setMapFilterSelections((prev) => {
                              if (event.target.checked) {
                                return Array.from(new Set([...prev, option.value]));
                              }
                              return prev.filter((value) => value !== option.value);
                            });
                          }}
                        />
                        <span>{option.label}</span>
                        <input
                          type="color"
                          value={
                            option.value.startsWith("unscheduled:")
                              ? groupColorById.get(option.value.replace("unscheduled:", "")) ?? "#7c3aed"
                              : dayColorByKey.get(option.value) ?? "#2563eb"
                          }
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => {
                            event.stopPropagation();
                            if (!canEdit) {
                              return;
                            }
                            const nextColor = event.target.value;
                            if (option.value.startsWith("unscheduled:")) {
                              updateUnscheduledGroup(tripId!, option.value.replace("unscheduled:", ""), {
                                color: nextColor
                              });
                            } else {
                              const day = dayByKey.get(option.value);
                              if (day) {
                                updateDay(tripId!, day.id, { color: nextColor });
                              }
                            }
                          }}
                          className="h-5 w-5 cursor-pointer rounded-full border"
                          title="Pick color"
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No days or groups yet.</p>
                )}
              </div>

              {showSavedLocations ? (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold">Saved locations</h4>
                  <div className="mt-3 flex flex-col gap-3">
                    {locations.filter((location) => !itineraryItems.some((item) => item.locationId === location.id)).length ? (
                      locations
                        .filter((location) => !itineraryItems.some((item) => item.locationId === location.id))
                        .map((location) => (
                        <div
                          key={location.id}
                          className={`ml-1 relative cursor-pointer rounded-md border p-3 ${
                            selectedSavedLocationId === location.id ? "ring-2 ring-primary/40" : ""
                          }`}
                          onClick={() => handleSelectSavedLocation(location)}
                        >
                          <div className="pr-10">
                            <strong className="text-sm font-semibold">{location.name}</strong>
                          </div>
                          {canEdit ? (
                            <div className="absolute right-2 top-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenLocationMenuId((prev) =>
                                    prev === location.id ? null : location.id
                                  );
                                }}
                              >
                                ⋯
                              </Button>
                              {openLocationMenuId === location.id ? (
                                <div
                                  ref={locationMenuRef}
                                  className="absolute right-0 top-full z-10 mt-2 w-40 rounded-md border bg-white shadow"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                                    onClick={() => {
                                      setOpenLocationMenuId(null);
                                      handleOpenAssignDialog(location);
                                    }}
                                  >
                                    Move to day/group
                                  </button>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                                    onClick={() => {
                                      setOpenLocationMenuId(null);
                                      handleStartLocationEdit(location);
                                    }}
                                    disabled={editingLocationId === location.id}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-100"
                                    onClick={() => {
                                      setOpenLocationMenuId(null);
                                      handleDeleteLocation(location);
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {editingLocationId === location.id ? (
                            <div className="mt-3 flex flex-col gap-3">
                              <Input
                                type="text"
                                value={editingLocationName}
                                onChange={(event) => setEditingLocationName(event.target.value)}
                                placeholder="Location name"
                              />
                              <Input
                                type="text"
                                value={editingLocationAddress}
                                onChange={(event) => setEditingLocationAddress(event.target.value)}
                                placeholder="Address"
                              />
                              <Textarea
                                rows={3}
                                value={editingLocationNote}
                                onChange={(event) => setEditingLocationNote(event.target.value)}
                                placeholder="Notes"
                              />
                              <div className="flex flex-wrap items-center gap-3">
                                <Button
                                  onClick={handleSaveLocationEdit}
                                  disabled={savingLocationEdit || !editingLocationName.trim()}
                                >
                                  {savingLocationEdit ? "Saving..." : "Save"}
                                </Button>
                                <Button variant="outline" onClick={handleCancelLocationEdit}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {location.note ? (
                                <p className="mt-2 text-sm text-muted-foreground">{location.note}</p>
                              ) : null}
                              {location.address ? (
                                <p className="text-sm text-muted-foreground">{location.address}</p>
                              ) : null}
                            </>
                          )}
                        </div>
                        ))
                    ) : (
                      <p className="text-sm text-muted-foreground">All saved locations are assigned.</p>
                    )}
                  </div>
                </div>
              ) : null}

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

              <DndContext
                onDragStart={(event) => {
                  const id = String(event.active.id);
                  if (id.startsWith("map-item:")) {
                    setActiveMapDragId(id.replace("map-item:", ""));
                  }
                }}
                onDragEnd={(event) => {
                  handleMapDragEnd(event);
                  setActiveMapDragId(null);
                }}
                onDragCancel={() => setActiveMapDragId(null)}
                collisionDetection={mapCollisionDetection}
              >
                {mapSelectedItemsBySection.size ? (
                  <SortableContext items={mapSortableIds} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-3">
                      {mapFlatList.map((entry) => {
                        if (entry.type === "header") {
                          return (
                            <MapHeader key={entry.sectionKey} id={`map-header:${entry.sectionKey}`}>
                              <h4 className="text-sm font-semibold">{resolveSectionLabel(entry.sectionKey)}</h4>
                            </MapHeader>
                          );
                        }

                        const item = entry.item;
                        if (!item.locationId) {
                          return null;
                        }
                        const location = locationById.get(item.locationId);
                        if (!location) {
                          return null;
                        }
                        const sectionItems = mapSelectedItemsBySection.get(entry.sectionKey) ?? [];
                        const currentIndex = sectionItems.findIndex((sectionItem) => sectionItem.id === item.id);
                        const nextItem = currentIndex >= 0 ? sectionItems[currentIndex + 1] : undefined;
                        const nextLocation = nextItem?.locationId
                          ? locationById.get(nextItem.locationId)
                          : undefined;

                        return (
                          <MapSortableItem key={item.id} id={`map-item:${item.id}`}>
                            {(dragHandleProps) => {
                              const dragProps = dragHandleProps as Record<string, unknown>;
                              const handleDragClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
                                event.stopPropagation();
                                const onClick = dragProps.onClick as ((evt: ReactMouseEvent<HTMLButtonElement>) => void) | undefined;
                                onClick?.(event);
                              };
                              const { onClick: _ignored, ...restDragProps } = dragProps as { onClick?: unknown };
                              return (
                              <div className="flex flex-col gap-2">
                                <Card
                                  className={`ml-1 relative cursor-pointer p-3 ${
                                    selectedMapItemId === item.id ? "ring-2 ring-primary/40" : ""
                                  }`}
                                  onClick={() => {
                                    if (location) {
                                      setSelectedSavedLocationId(location.id);
                                      setPending(null);
                                    }
                                  }}
                                >
                                  <div className="flex flex-wrap items-center gap-2 pr-16">
                                    <strong className="text-sm font-semibold">{item.title}</strong>
                                    <Badge variant="outline">{item.type}</Badge>
                                  </div>
                                  {canEdit ? (
                                    <div className="absolute right-2 top-2 flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setOpenMapItemMenuId((prev) =>
                                            prev === item.id ? null : item.id
                                          );
                                        }}
                                      >
                                        ⋯
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        {...(restDragProps as Record<string, unknown>)}
                                        onClick={handleDragClick}
                                      >
                                        ⠿
                                      </Button>
                                      {openMapItemMenuId === item.id ? (
                                        <div
                                          ref={mapItemMenuRef}
                                          className="absolute right-0 top-full z-10 mt-2 w-28 rounded-md border bg-white shadow"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          <button
                                            type="button"
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                                            onClick={() => handleEditMapItem(item)}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-100"
                                            onClick={() => handleDeleteMapItem(item)}
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  <p className="mt-2 text-sm text-muted-foreground">{location.name}</p>
                                  {location.address ? (
                                    <p className="text-sm text-muted-foreground">{location.address}</p>
                                  ) : null}
                                </Card>
                                {nextLocation ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenRoute(location, nextLocation)}
                                  >
                                    Route to next location
                                  </Button>
                                ) : null}
                              </div>
                            );
                            }}
                          </MapSortableItem>
                        );
                      })}
                    </div>
                  </SortableContext>
                ) : (
                  <p className="text-sm text-muted-foreground">Select at least one day or group.</p>
                )}
                <DragOverlay>
                  {activeMapDragId ? (() => {
                    const item = itineraryItems.find((entry) => entry.id === activeMapDragId);
                    const location = item?.locationId ? locationById.get(item.locationId) : undefined;
                    if (!item || !location) {
                      return null;
                    }
                    return (
                      <div className="flex w-full flex-col gap-2">
                        <Card className="p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm font-semibold">{item.title}</strong>
                            <Badge variant="outline">{item.type}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{location.name}</p>
                          {location.address ? (
                            <p className="text-sm text-muted-foreground">{location.address}</p>
                          ) : null}
                        </Card>
                      </div>
                    );
                  })() : null}
                </DragOverlay>
              </DndContext>
            </div>

          </Card>
          <div className="h-[calc(100vh-220px)]">
            <MapPanel
              markers={mapMarkers}
              onSelect={setPending}
              canEdit={canEdit}
              selectedLocation={selectedLocationForMap}
              onClearSelected={() => {
                setPending(null);
                setSelectedSavedLocationId(null);
              }}
              destination={trip.destination}
              destinationPlaceId={trip.destinationPlaceId}
              onDestinationPlaceId={handleDestinationPlaceId}
            />
          </div>
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
