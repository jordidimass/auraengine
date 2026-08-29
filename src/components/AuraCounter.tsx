"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function AuraCounter({
  value,
  label = "Brand aura",
  suffix = "total",
  valueClassName,
}: {
  value: number;
  label?: string;
  suffix?: string;
  valueClassName?: string;
}) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (v) =>
    Math.round(v).toLocaleString("en-US"),
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <motion.span
          className={cn(
            "text-lg font-medium tabular-nums tracking-tight text-primary",
            valueClassName,
          )}
        >
          {display}
        </motion.span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
}
