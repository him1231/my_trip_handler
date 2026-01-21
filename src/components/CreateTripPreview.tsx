import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

type CreateTripPreviewProps = {
  title: string;
  destination?: string;
  template: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  description?: string;
};

const CreateTripPreview = ({
  title,
  destination,
  template,
  startDate,
  endDate,
  timezone,
  description
}: CreateTripPreviewProps) => {
  return (
    <Card className="bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-base font-semibold">{title}</h4>
        <Badge variant="secondary">{template}</Badge>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        <p>{destination || "No destination set"}</p>
        <p>
          {startDate && endDate ? `${startDate} → ${endDate}` : "Dates not set"}
        </p>
        <p>{timezone ? `Timezone: ${timezone}` : "Timezone not set"}</p>
      </div>
      {description ? <p className="mt-2 text-sm">{description}</p> : null}
    </Card>
  );
};

export default CreateTripPreview;
