import { PLATFORMS, platformShortLabel, type Platform } from "@/lib/platforms";
import { cn } from "@/lib/utils";

export function PlatformToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: Platform;
  onChange: (platform: Platform) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      {PLATFORMS.map((platform) => (
        <button
          key={platform}
          type="button"
          disabled={disabled}
          onClick={() => onChange(platform)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs uppercase tracking-widest transition disabled:cursor-not-allowed disabled:opacity-50",
            value === platform
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {platformShortLabel(platform)}
        </button>
      ))}
    </div>
  );
}
