"use client";

import { useState, useTransition } from "react";
import { updateDayAction } from "@/lib/actions/days";
import { MoodPicker } from "./mood-picker";
import { inputClass } from "./ui";

/** Estado de ánimo y nota del día; se guardan al cambiar el estado de ánimo o al salir de la nota. */
export function DayEditor({
  date,
  mood: initialMood,
  note: initialNote,
}: {
  date: string;
  mood: number;
  note: string | null;
}) {
  const [mood, setMood] = useState(initialMood);
  const [note, setNote] = useState(initialNote ?? "");
  const [savedNote, setSavedNote] = useState(initialNote ?? "");
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save(next: { mood: number; note: string }) {
    startTransition(async () => {
      const result = await updateDayAction({ date, ...next });
      if (result.status === "saved") {
        setSavedNote(next.note);
        setMessage("Guardado");
      } else {
        setMessage(
          result.status === "invalid" ? result.error : "Este día ya no existe",
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <MoodPicker
        label="Estado de ánimo"
        value={mood}
        onChange={(value) => {
          setMood(value);
          save({ mood: value, note });
        }}
      />
      <div className="space-y-1">
        <label htmlFor="day-note" className="block text-sm font-medium">
          Nota del día
        </label>
        <textarea
          id="day-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            if (note !== savedNote) save({ mood, note });
          }}
          rows={3}
          maxLength={2000}
          placeholder="Opcional"
          className={inputClass}
        />
      </div>
      <output aria-live="polite" className="block h-5 text-sm text-muted">
        {pending ? "Guardando…" : message}
      </output>
    </div>
  );
}
