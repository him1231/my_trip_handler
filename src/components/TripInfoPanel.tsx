import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import * as yup from "yup";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select";
import { Trip, TripRole } from "../lib/types";
import DateRangePicker from "./DateRangePicker";
import { Textarea } from "./ui/textarea";

export type TripInfoStat = {
  label: string;
  value: number | string;
};

export type TripInfoTimelineEntry = {
  id: string;
  title: string;
  meta?: string;
};

export type TripInfoTimelineGroup = {
  id: string;
  label: string;
  entries: TripInfoTimelineEntry[];
  isUnscheduled?: boolean;
};

type TripInfoPanelProps = {
  trip: Trip;
  role: TripRole | null;
  canEdit: boolean;
  tripStart: Date | null;
  tripEnd: Date | null;
  tripDuration: number | null;
  stats: TripInfoStat[];
  timelineGroups: TripInfoTimelineGroup[];
  onSaveCoverImage: (url: string | null) => Promise<void>;
  onSaveTripDetails: (payload: {
    title: string;
    description?: string | null;
    destination?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    timezone?: string | null;
  }) => Promise<void>;
};

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const TripInfoPanel = ({
  trip,
  role,
  canEdit,
  tripStart,
  tripEnd,
  tripDuration,
  stats,
  timelineGroups,
  onSaveCoverImage,
  onSaveTripDetails
}: TripInfoPanelProps) => {
  const [editingDetails, setEditingDetails] = useState(false);
  const [coverUrl, setCoverUrl] = useState(trip.coverImageUrl ?? "");
  const [savingCover, setSavingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const timezones = useMemo(() => {
    const current = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const common = ["UTC", "Asia/Tokyo", "America/Los_Angeles", "Europe/London", current];
    return Array.from(new Set(common));
  }, []);

  const detailsSchema = useMemo(
    () =>
      yup.object({
        title: yup.string().trim().required("Title is required").max(100, "Max 100 characters"),
        description: yup.string().max(500, "Max 500 characters"),
        destination: yup.string().max(100, "Max 100 characters"),
        startDate: yup.date().nullable(),
        endDate: yup
          .date()
          .nullable()
          .test("after-start", "End date must be after start date", function (value) {
            const start = (this.parent as { startDate?: Date | null }).startDate;
            if (!start || !value) {
              return true;
            }
            return value >= start;
          })
          .test("both-set", "Select both start and end dates", function (value) {
            const start = (this.parent as { startDate?: Date | null }).startDate;
            if (!start && !value) {
              return true;
            }
            return Boolean(start && value);
          }),
        timezone: yup.string().nullable()
      }),
    []
  );

  const detailsFormik = useFormik({
    initialValues: {
      title: trip.title,
      description: trip.description ?? "",
      destination: trip.destination ?? "",
      startDate: trip.startDate ?? null,
      endDate: trip.endDate ?? null,
      timezone: trip.timezone ?? ""
    },
    enableReinitialize: true,
    validationSchema: detailsSchema,
    onSubmit: async (values, helpers) => {
      setDetailsError(null);
      try {
        await onSaveTripDetails({
          title: values.title.trim(),
          description: values.description.trim() || null,
          destination: values.destination.trim() || null,
          startDate: values.startDate ?? null,
          endDate: values.endDate ?? null,
          timezone: values.timezone.trim() || null
        });
        setEditingDetails(false);
      } catch (error) {
        console.error("Failed to update trip details", error);
        setDetailsError("Unable to update trip details. Please try again.");
      } finally {
        helpers.setSubmitting(false);
      }
    }
  });

  useEffect(() => {
    setCoverUrl(trip.coverImageUrl ?? "");
  }, [trip.coverImageUrl]);

  const handleSaveCover = async () => {
    if (!canEdit) {
      return;
    }
    const trimmed = coverUrl.trim();
    if (trimmed.length === 0) {
      setSavingCover(true);
      setCoverError(null);
      try {
        await onSaveCoverImage(null);
      } catch (error) {
        console.error("Failed to update cover image", error);
        setCoverError("Unable to update cover image. Please try again.");
      } finally {
        setSavingCover(false);
      }
      return;
    }
    if (!isValidUrl(trimmed)) {
      setCoverError("Please enter a valid http(s) URL.");
      return;
    }
    setSavingCover(true);
    setCoverError(null);
    try {
      await onSaveCoverImage(trimmed);
    } catch (error) {
      console.error("Failed to update cover image", error);
      setCoverError("Unable to update cover image. Please try again.");
    } finally {
      setSavingCover(false);
    }
  };

  const showCoverImage = Boolean(trip.coverImageUrl);
  const dateRangeLabel = tripStart && tripEnd
    ? `${tripStart.toLocaleDateString()} → ${tripEnd.toLocaleDateString()}`
    : "Dates not set";
  const durationLabel = tripDuration ? `${tripDuration} days` : "Duration not set";

  return (
    <Card className="mt-4 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">Trip summary</h3>
              {trip.template ? <Badge variant="secondary">{trip.template}</Badge> : null}
            </div>
            {canEdit ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingDetails((prev) => !prev);
                  setDetailsError(null);
                }}
              >
                {editingDetails ? "Close edit" : "Edit trip"}
              </Button>
            ) : null}
          </div>
          {!editingDetails ? (
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Destination</p>
                <p className="font-medium text-foreground">{trip.destination ?? "No destination"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Dates</p>
                <p className="font-medium text-foreground">{dateRangeLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Duration</p>
                <p className="font-medium text-foreground">{durationLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Timezone</p>
                <p className="font-medium text-foreground">{trip.timezone ?? "Timezone not set"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Members</p>
                <p className="font-medium text-foreground">{trip.memberIds.length}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Your role</p>
                <p className="font-medium text-foreground">{role ?? "unknown"}</p>
              </div>
            </div>
          ) : null}
          {editingDetails ? (
            <form className="grid gap-4 rounded-lg border bg-muted/30 p-4 text-sm" onSubmit={detailsFormik.handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trip-title">Title</Label>
                  <Input
                    id="trip-title"
                    value={detailsFormik.values.title}
                    onChange={detailsFormik.handleChange("title")}
                    onBlur={detailsFormik.handleBlur("title")}
                  />
                  {detailsFormik.touched.title && detailsFormik.errors.title ? (
                    <p className="text-sm text-destructive">{detailsFormik.errors.title}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trip-destination">Destination</Label>
                  <Input
                    id="trip-destination"
                    value={detailsFormik.values.destination}
                    onChange={detailsFormik.handleChange("destination")}
                    onBlur={detailsFormik.handleBlur("destination")}
                  />
                  {detailsFormik.touched.destination && detailsFormik.errors.destination ? (
                    <p className="text-sm text-destructive">{detailsFormik.errors.destination}</p>
                  ) : null}
                </div>
              </div>
              <DateRangePicker
                label="Dates"
                description="Pick start and end dates in one calendar."
                startDate={detailsFormik.values.startDate ?? undefined}
                endDate={detailsFormik.values.endDate ?? undefined}
                onChange={(range) => {
                  detailsFormik.setFieldValue("startDate", range?.from ?? null);
                  detailsFormik.setFieldValue("endDate", range?.to ?? null);
                }}
                defaultMonth={detailsFormik.values.startDate ?? new Date()}
              />
              {detailsFormik.touched.startDate && detailsFormik.errors.startDate ? (
                <p className="text-sm text-destructive">{detailsFormik.errors.startDate}</p>
              ) : null}
              {detailsFormik.touched.endDate && detailsFormik.errors.endDate ? (
                <p className="text-sm text-destructive">{detailsFormik.errors.endDate}</p>
              ) : null}
              <div className="flex flex-col gap-2">
                <Label>Timezone</Label>
                <Select
                  value={detailsFormik.values.timezone}
                  onValueChange={(value) => detailsFormik.setFieldValue("timezone", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="trip-description">Description</Label>
                <Textarea
                  id="trip-description"
                  value={detailsFormik.values.description}
                  onChange={detailsFormik.handleChange("description")}
                  onBlur={detailsFormik.handleBlur("description")}
                />
                {detailsFormik.touched.description && detailsFormik.errors.description ? (
                  <p className="text-sm text-destructive">{detailsFormik.errors.description}</p>
                ) : null}
              </div>
              {detailsError ? <p className="text-sm text-destructive">{detailsError}</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="submit"
                  disabled={!detailsFormik.isValid || !detailsFormik.dirty || detailsFormik.isSubmitting}
                >
                  {detailsFormik.isSubmitting ? "Saving..." : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    detailsFormik.resetForm();
                    setEditingDetails(false);
                    setDetailsError(null);
                  }}
                  disabled={detailsFormik.isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
        </div>
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-lg border bg-muted/20">
            {showCoverImage ? (
              <img
                src={trip.coverImageUrl}
                alt="Trip cover"
                className="h-40 w-full object-cover"
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No cover image
              </div>
            )}
          </div>
          {canEdit ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="cover-image-url">Cover image URL</Label>
              <Input
                id="cover-image-url"
                type="url"
                placeholder="https://example.com/cover.jpg"
                value={coverUrl}
                onChange={(event) => setCoverUrl(event.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleSaveCover}
                  disabled={savingCover || coverUrl.trim() === (trip.coverImageUrl ?? "").trim()}
                >
                  {savingCover ? "Saving..." : "Save cover"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCoverUrl("");
                    setCoverError(null);
                  }}
                  disabled={savingCover || coverUrl.length === 0}
                >
                  Clear
                </Button>
              </div>
              {coverError ? <p className="text-sm text-destructive">{coverError}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold">Trip stats</h4>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-semibold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold">Trip timeline</h4>
        {timelineGroups.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No timeline entries yet.</p>
        ) : (
          <div className="mt-3 max-h-72 space-y-4 overflow-y-auto pr-1">
            {timelineGroups.map((group) => (
              <div key={group.id} className="rounded-lg border bg-background p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{group.label}</p>
                  {group.isUnscheduled ? (
                    <Badge variant="outline">Unscheduled</Badge>
                  ) : null}
                </div>
                {group.entries.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">No items yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {group.entries.map((entry) => (
                      <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{entry.title}</span>
                        {entry.meta ? (
                          <span className="text-xs text-muted-foreground">{entry.meta}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TripInfoPanel;
