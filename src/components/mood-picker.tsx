"use client";

import { MOODS } from "@/lib/labels";

export function MoodPicker({
  value,
  onChange,
  label = "Estado de ánimo",
  error,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
}) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-5 gap-1">
        {MOODS.map((mood) => {
          const checked = mood.value === value;
          return (
            <button
              key={mood.value}
              type="button"
              aria-pressed={checked}
              aria-label={mood.label}
              onClick={() => onChange(mood.value)}
              className={`flex flex-col items-center rounded-xl border py-2 ${
                checked
                  ? "border-accent bg-accent/10"
                  : error
                    ? "border-danger"
                    : "border-border bg-surface"
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {mood.emoji}
              </span>
              <span className="text-[11px] text-muted">{mood.label}</span>
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </fieldset>
  );
}
