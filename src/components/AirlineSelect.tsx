import { useEffect, useMemo, useRef, useState } from "react";
import { airlines } from "../lib/airlines";
import { cn } from "../lib/utils";
import { Input } from "./ui/input";

type AirlineSelectProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const AirlineSelect = ({ value, onChange, placeholder = "Search airline or IATA code" }: AirlineSelectProps) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      return airlines;
    }
    return airlines.filter((airline) =>
      `${airline.code} ${airline.name}`.toLowerCase().includes(query)
    );
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) {
        return;
      }
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
      />
      {open ? (
        <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-md border bg-white shadow">
          {filtered.length ? (
            filtered.map((airline) => (
              <button
                key={airline.code}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-100",
                  value.toUpperCase() === airline.code && "bg-slate-50"
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(airline.code);
                  setOpen(false);
                }}
              >
                <span className="font-medium">{airline.code}</span>
                <span className="text-muted-foreground">{airline.name}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matches.</div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default AirlineSelect;
