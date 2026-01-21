import type { ItineraryItem as ItineraryItemType } from "../lib/types";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

type ItineraryItemProps = {
  item: ItineraryItemType;
};

const formatTime = (date?: Date) => {
  if (!date) {
    return null;
  }
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const ItineraryItem = ({ item }: ItineraryItemProps) => {
  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-sm font-semibold">{item.title}</strong>
        <Badge variant="secondary">{item.type}</Badge>
        {item.startTime ? <Badge variant="outline">{formatTime(item.startTime)}</Badge> : null}
      </div>
      {item.note ? <p className="mt-2 text-sm text-muted-foreground">{item.note}</p> : null}
    </Card>
  );
};

export default ItineraryItem;
