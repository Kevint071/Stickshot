"use client";

import { motion } from "motion/react";
import { MOODS } from "@/lib/labels";

export function MoodPicker({
  value,
  onChange,
  label = "¿Cómo te sentiste hoy?",
  error,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="label-mono mb-1.5 text-muted">{label}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {MOODS.map((mood) => {
          const checked = mood.value === value;
          return (
            <button
              key={mood.value}
              type="button"
              aria-pressed={checked}
              aria-label={mood.label}
              onClick={() => onChange(mood.value)}
              className={`group relative flex flex-col items-center gap-1 rounded-2xl border py-3 transition-[border-color,background-color,transform] duration-200 active:scale-95 ${
                checked
                  ? "border-accent bg-accent/10"
                  : error
                    ? "border-danger"
                    : "border-border bg-surface hover:border-border-strong"
              }`}
            >
              <motion.span
                className="text-2xl sm:text-3xl"
                aria-hidden="true"
                animate={
                  checked
                    ? { scale: [1, 1.35, 1.1], rotate: [0, -12, 0] }
                    : { scale: 1, rotate: 0 }
                }
                transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {mood.emoji}
              </motion.span>
              <span
                className={`text-[11px] ${checked ? "font-semibold text-foreground" : "text-muted"}`}
              >
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="animate-rise text-sm text-danger">{error}</p>
      ) : null}
    </fieldset>
  );
}
