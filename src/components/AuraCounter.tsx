"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

export function AuraCounter({ value }: { value: number }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString("en-US"));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <div className="flex flex-col items-end">
      <span className="text-xs uppercase tracking-[0.3em] text-fuchsia-400/70">
        Global Aura Farmeada
      </span>
      <motion.span className="font-mono text-4xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(232,121,249,0.6)]">
        {display}
      </motion.span>
    </div>
  );
}
