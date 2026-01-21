import { Button } from "./ui/button";

type CreateTripModeToggleProps = {
  mode: "wizard" | "quick";
  onChange: (mode: "wizard" | "quick") => void;
};

const CreateTripModeToggle = ({ mode, onChange }: CreateTripModeToggleProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant={mode === "wizard" ? "default" : "outline"} onClick={() => onChange("wizard")}>
        Guided setup
      </Button>
      <Button variant={mode === "quick" ? "default" : "outline"} onClick={() => onChange("quick")}>
        Quick create
      </Button>
    </div>
  );
};

export default CreateTripModeToggle;
