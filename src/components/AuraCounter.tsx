"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

export function AuraCounter({
  value,
  label = "Brand aura",
}: {
  value: number;
  label?: string;
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
        <motion.span className="text-lg font-medium tabular-nums tracking-tight text-primary">
          {display}
        </motion.span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          total
        </span>
      </div>
    </div>
  );
}
