"use client";

export interface RiskSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function riskLabel(value: number): string {
  if (value <= 25) return "Diplomático";
  if (value <= 50) return "Educativo";
  if (value <= 75) return "Directo";
  return "Roast";
}

export function RiskSlider({ value, onChange, disabled = false }: RiskSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-400/70">
            Nivel de riesgo
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Controla qué tan agresiva sale la contranarrativa
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono text-3xl font-bold text-fuchsia-300">
            {value}
          </span>
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            {riskLabel(value)}
          </p>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-fuchsia-400 [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(232,121,249,0.8)]"
      />

      <div className="flex justify-between text-[10px] uppercase tracking-widest text-zinc-600">
        <span>0 · Diplomático</span>
        <span>50 · Educativo</span>
        <span>100 · Roast</span>
      </div>
    </div>
  );
}
