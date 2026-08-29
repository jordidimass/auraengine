"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export type RiskBand = "diplomatic" | "educational" | "direct" | "roast";

const BANDS: {
  id: RiskBand;
  label: string;
  min: number;
  max: number;
  copy: string;
}[] = [
  {
    id: "diplomatic",
    label: "Diplomatic",
    min: 0,
    max: 25,
    copy: "Adds a fact that complements without confronting.",
  },
  {
    id: "educational",
    label: "Educational",
    min: 26,
    max: 50,
    copy: "Corrects with evidence. Neutral register.",
  },
  {
    id: "direct",
    label: "Direct",
    min: 51,
    max: 75,
    copy: "Names the error. No padding.",
  },
  {
    id: "roast",
    label: "Roast",
    min: 76,
    max: 100,
    copy: "Open confrontation with an edge. Reads as a challenge, on purpose.",
  },
];

export function riskBandFor(value: number): (typeof BANDS)[number] {
  return (
    BANDS.find((band) => value >= band.min && value <= band.max) ?? BANDS[0]
  );
}

export function RiskSlider({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const band = riskBandFor(value);
  const isRoast = band.id === "roast";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Risk level</p>
          <p
            className={cn(
              "text-sm font-medium",
              isRoast ? "text-risk" : "text-foreground",
            )}
          >
            {band.label}
          </p>
        </div>
        <span
          className={cn(
            "font-mono text-lg tabular-nums",
            isRoast ? "text-risk" : "text-primary",
          )}
        >
          {value}
        </span>
      </div>

      <Slider
        min={0}
        max={100}
        step={1}
        value={[value]}
        onValueChange={(next) => onChange(next[0] ?? 0)}
        disabled={disabled}
        aria-label="Risk level"
        className={cn(isRoast && "[&_[data-slot=slider-range]]:bg-risk")}
      />

      <div className="flex justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {BANDS.map((item) => (
          <span
            key={item.id}
            className={cn(item.id === band.id && "text-foreground")}
          >
            {item.label}
          </span>
        ))}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{band.copy}</p>
    </div>
  );
}
