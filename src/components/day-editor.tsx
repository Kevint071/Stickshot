"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { updateDayAction } from "@/lib/actions/days";
import { CheckIcon } from "./icons";
import { MoodPicker } from "./mood-picker";
import { inputClass, Pulse } from "./ui";

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
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();

  function save(next: { mood: number; note: string }) {
    startTransition(async () => {
      const result = await updateDayAction({ date, ...next });
      if (result.status === "saved") {
        setSavedNote(next.note);
        setMessage({ ok: true, text: "Guardado" });
      } else {
        setMessage({
          ok: false,
          text:
            result.status === "invalid"
              ? result.error
              : "Este día ya no existe",
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      <MoodPicker
        label="Estado de ánimo"
        value={mood}
        onChange={(value) => {
          setMood(value);
          save({ mood: value, note });
        }}
      />
      <div className="space-y-1.5">
        <label htmlFor="day-note" className="label-mono block text-muted">
          Nota del día
        </label>
        <textarea
          id="day-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            if (note !== savedNote) save({ mood, note });
          }}
          rows={4}
          maxLength={2000}
          placeholder="¿Qué salió bien? ¿Qué toca mañana?"
          className={inputClass}
        />
      </div>
      <output aria-live="polite" className="flex h-5 items-center text-sm">
        <AnimatePresence mode="wait">
          {pending ? (
            <motion.span
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-2 text-muted"
            >
              Guardando <Pulse />
            </motion.span>
          ) : message ? (
            <motion.span
              key={message.text}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`inline-flex items-center gap-1.5 ${message.ok ? "text-success" : "text-danger"}`}
            >
              {message.ok ? <CheckIcon size={16} /> : null}
              {message.text}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </output>
    </div>
  );
}
