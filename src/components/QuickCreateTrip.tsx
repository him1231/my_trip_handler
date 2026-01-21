import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

type QuickCreateTripProps = {
  onCreate: (title: string) => Promise<void>;
};

const QuickCreateTrip = ({ onCreate }: QuickCreateTripProps) => {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await onCreate(title.trim());
      setTitle("");
    } catch (err) {
      console.error(err);
      setError("Unable to create trip. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Quick create</h2>
          <p className="text-sm text-muted-foreground">Create a trip with just a title.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Input
          type="text"
          placeholder="Summer in Seoul"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button onClick={handleCreate} disabled={creating || !title.trim()}>
          {creating ? "Creating..." : "Create trip"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </Card>
  );
};

export default QuickCreateTrip;
