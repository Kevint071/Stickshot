"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";

/** Cifra que sube desde 0 hasta su valor al aparecer. */
export function CountUp({
  value,
  delay = 0,
  className,
}: {
  value: number;
  delay?: number;
  className?: string;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) =>
    Math.round(latest).toLocaleString("es"),
  );
  useEffect(() => {
    const controls = animate(count, value, {
      duration: Math.min(1.6, 0.6 + value / 200),
      delay,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [count, value, delay]);
  return (
    <motion.span className={className} aria-label={String(value)}>
      {rounded}
    </motion.span>
  );
}
