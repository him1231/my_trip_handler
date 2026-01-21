import { useMemo, useState } from "react";
import { useFormik } from "formik";
import * as yup from "yup";
import CreateTripPreview from "./CreateTripPreview";
import DateRangePicker from "./DateRangePicker";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select";
import { Textarea } from "./ui/textarea";

const stepLabels = ["Basics", "Dates", "Setup", "Review"] as const;

const templates = [
  { value: "custom", label: "Custom" },
  { value: "vacation", label: "Vacation" },
  { value: "weekend", label: "Weekend Getaway" },
  { value: "business", label: "Business Trip" },
  { value: "roadtrip", label: "Road Trip" }
];

const commonDestinations = [
  "Tokyo, Japan",
  "Seoul, South Korea",
  "Bangkok, Thailand",
  "Singapore",
  "Paris, France",
  "London, UK",
  "New York City, USA",
  "Los Angeles, USA",
  "Sydney, Australia",
  "Rome, Italy",
  "Barcelona, Spain",
  "Dubai, UAE"
];

const getTimezones = () => {
  const current = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const common = ["UTC", "Asia/Tokyo", "America/Los_Angeles", "Europe/London", current];
  return Array.from(new Set(common));
};

type WizardValues = {
  title: string;
  description: string;
  destination: string;
  template: string;
  startDate: string;
  endDate: string;
  autoCreateDays: boolean;
  addSampleItems: boolean;
  timezone: string;
};

type CreateTripWizardProps = {
  onCreate: (values: {
    title: string;
    description?: string;
    destination?: string;
    template?: string;
    startDate?: Date;
    endDate?: Date;
    timezone?: string;
    autoCreateDays: boolean;
  }) => Promise<void>;
};

const CreateTripWizard = ({ onCreate }: CreateTripWizardProps) => {
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDestinationList, setShowDestinationList] = useState(false);
  const timezones = useMemo(getTimezones, []);

  const schemas = useMemo(
    () => [
      yup.object({
        title: yup.string().trim().required("Title is required").max(100, "Max 100 characters"),
        description: yup.string().max(500, "Max 500 characters"),
        destination: yup.string().max(100, "Max 100 characters"),
        template: yup.string().required()
      }),
      yup.object({
        startDate: yup.string().required("Start date is required"),
        endDate: yup
          .string()
          .required("End date is required")
          .test(
            "after-start",
            "End date must be after start date",
            function (this: yup.TestContext<yup.AnyObject>, value?: string) {
              const start = (this.parent as WizardValues).startDate;
              if (!start || !value) {
                return true;
              }
              return new Date(value) >= new Date(start);
            }
          )
      }),
      yup.object({
        timezone: yup.string().required("Timezone is required")
      }),
      yup.object()
    ],
    []
  );

  const formik = useFormik<WizardValues>({
    initialValues: {
      title: "",
      description: "",
      destination: "",
      template: "custom",
      startDate: "",
      endDate: "",
      autoCreateDays: true,
      addSampleItems: false,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    validationSchema: schemas[step],
    validateOnChange: true,
    onSubmit: async (values: WizardValues, helpers) => {
      if (step < stepLabels.length - 1) {
        setStep((prev) => prev + 1);
        helpers.setTouched({});
        return;
      }

      setSubmitError(null);
      try {
        await onCreate({
          title: values.title.trim(),
          description: values.description.trim() || undefined,
          destination: values.destination.trim() || undefined,
          template: values.template,
          startDate: values.startDate ? new Date(values.startDate) : undefined,
          endDate: values.endDate ? new Date(values.endDate) : undefined,
          timezone: values.timezone,
          autoCreateDays: values.autoCreateDays
        });
      } catch (error) {
        console.error(error);
        setSubmitError("Unable to create trip. Please try again.");
      } finally {
        helpers.setSubmitting(false);
      }
    }
  });

  const filteredDestinations = useMemo(() => {
    const query = formik.values.destination.trim().toLowerCase();
    if (!query) {
      return commonDestinations;
    }
    return commonDestinations.filter((destination) => destination.toLowerCase().includes(query));
  }, [formik.values.destination]);

  const durationDays = useMemo(() => {
    if (!formik.values.startDate || !formik.values.endDate) {
      return null;
    }
    const start = new Date(formik.values.startDate);
    const end = new Date(formik.values.endDate);
    const diff = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : null;
  }, [formik.values.endDate, formik.values.startDate]);

  const formatInputDate = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  };

  const handleRangeChange = (range?: { from?: Date; to?: Date }) => {
    if (!range?.from) {
      formik.setFieldValue("startDate", "");
      formik.setFieldValue("endDate", "");
      return;
    }

    const nextStart = formatInputDate(range.from);
    const nextEnd = range.to ? formatInputDate(range.to) : "";
    formik.setFieldValue("startDate", nextStart);
    if (nextEnd) {
      formik.setFieldValue("endDate", nextEnd);
      return;
    }
    formik.setFieldValue("endDate", "");
  };

  const handleBack = () => setStep((prev) => Math.max(0, prev - 1));

  const handleDestinationSelect = (destination: string) => {
    formik.setFieldValue("destination", destination);
    setShowDestinationList(false);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="flex flex-col gap-4">
            <div>
              <Label>Trip title</Label>
              <Input
                value={formik.values.title}
                onChange={formik.handleChange("title")}
                onBlur={formik.handleBlur("title")}
                placeholder="Summer in Seoul"
              />
              {formik.touched.title && formik.errors.title ? (
                <p className="mt-1 text-sm text-destructive">{formik.errors.title}</p>
              ) : null}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formik.values.description}
                onChange={formik.handleChange("description")}
                onBlur={formik.handleBlur("description")}
                placeholder="Trip overview and notes"
              />
              {formik.touched.description && formik.errors.description ? (
                <p className="mt-1 text-sm text-destructive">{formik.errors.description}</p>
              ) : null}
            </div>
            <div>
              <Label>Destination</Label>
              <div className="relative">
                <Input
                  value={formik.values.destination}
                  onChange={(event) => {
                    formik.handleChange("destination")(event);
                    setShowDestinationList(true);
                  }}
                  onBlur={formik.handleBlur("destination")}
                  onFocus={() => setShowDestinationList(true)}
                  placeholder="Search or type a destination"
                />
                {showDestinationList ? (
                  <div className="absolute z-20 mt-2 w-full rounded-md border bg-white shadow-lg">
                    <div className="max-h-52 overflow-auto p-2 text-sm">
                      {filteredDestinations.map((destination) => (
                        <button
                          key={destination}
                          type="button"
                          className="w-full rounded-md px-3 py-2 text-left hover:bg-slate-100"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleDestinationSelect(destination)}
                        >
                          {destination}
                        </button>
                      ))}
                      {filteredDestinations.length === 0 ? (
                        <p className="px-3 py-2 text-muted-foreground">No matches. Use custom text.</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
              {formik.touched.destination && formik.errors.destination ? (
                <p className="mt-1 text-sm text-destructive">{formik.errors.destination}</p>
              ) : null}
            </div>
            <div>
              <Label>Template</Label>
              <Select
                value={formik.values.template}
                onValueChange={(value) => formik.setFieldValue("template", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col gap-4">
            <DateRangePicker
              label="Dates"
              description="Pick start and end dates in one calendar."
              startDate={formik.values.startDate ? new Date(formik.values.startDate) : undefined}
              endDate={formik.values.endDate ? new Date(formik.values.endDate) : undefined}
              onChange={handleRangeChange}
              defaultMonth={formik.values.startDate ? new Date(formik.values.startDate) : new Date()}
            />
            {formik.touched.startDate && formik.errors.startDate ? (
              <p className="mt-1 text-sm text-destructive">{formik.errors.startDate}</p>
            ) : null}
            {formik.touched.endDate && formik.errors.endDate ? (
              <p className="mt-1 text-sm text-destructive">{formik.errors.endDate}</p>
            ) : null}
            {durationDays ? (
              <p className="text-sm text-muted-foreground">Trip length: {durationDays} days</p>
            ) : null}
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col gap-4">
            <div>
              <Label>Timezone</Label>
              <Select
                value={formik.values.timezone}
                onValueChange={(value) => formik.setFieldValue("timezone", value)}
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
              {formik.touched.timezone && formik.errors.timezone ? (
                <p className="mt-1 text-sm text-destructive">{formik.errors.timezone}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={formik.values.autoCreateDays}
                onChange={(event) => formik.setFieldValue("autoCreateDays", event.target.checked)}
              />
              <span>Auto-generate days based on date range</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={formik.values.addSampleItems}
                onChange={(event) => formik.setFieldValue("addSampleItems", event.target.checked)}
                disabled
              />
              <span>Add sample itinerary items (coming soon)</span>
            </div>
          </div>
        );
      case 3:
      default:
        return (
          <div className="flex flex-col gap-3 text-sm">
            <CreateTripPreview
              title={formik.values.title}
              destination={formik.values.destination}
              template={formik.values.template}
              startDate={formik.values.startDate}
              endDate={formik.values.endDate}
              timezone={formik.values.timezone}
              description={formik.values.description}
            />
            <p className="text-muted-foreground">Review the details, then create your trip.</p>
          </div>
        );
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Trip setup</h2>
          <p className="text-sm text-muted-foreground">Follow the steps to set up your trip.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {stepLabels.map((label, index) => (
            <span
              key={label}
              className={index === step ? "font-semibold text-foreground" : "text-muted-foreground"}
            >
              {index + 1}. {label}
            </span>
          ))}
        </div>
        <Separator />
      </div>

      <form className="mt-6 flex flex-col gap-6" onSubmit={formik.handleSubmit}>
        {renderStep()}

        {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={handleBack} disabled={step === 0}>
            Back
          </Button>
          <Button
            type="submit"
            disabled={!formik.isValid || formik.isSubmitting}
          >
            {formik.isSubmitting
              ? "Creating..."
              : step < stepLabels.length - 1
              ? "Next"
              : "Create trip"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default CreateTripWizard;
