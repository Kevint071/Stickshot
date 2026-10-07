"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Cleanliness, Hand, Subdivision } from "@/db/schema";
import {
  type LogActionResult,
  saveLogAction,
  updateLogAction,
} from "@/lib/actions/logs";
import {
  CLEANLINESS_LABELS,
  formatDay,
  HAND_LABELS,
  localToday,
  SUBDIVISION_LABELS,
} from "@/lib/labels";
import type { PickerExercise } from "@/server/exercises";
import { ExercisePicker } from "./exercise-picker";
import { MoodPicker } from "./mood-picker";
import { Segmented } from "./segmented";
import { inputClass, PrimaryButton } from "./ui";

export type LogFormInitial = {
  exerciseId?: string;
  date?: string;
  hand?: Hand;
  bpm?: number;
  subdivision?: Subdivision;
  durationSeconds?: number;
  sets?: number;
  cleanliness?: Cleanliness;
  note?: string | null;
};

const handOptions = (["right", "left"] as const).map((value) => ({
  value,
  label: HAND_LABELS[value],
}));

const subdivisionOptions = (
  [
    "quarter",
    "eighth",
    "triplet",
    "sixteenth",
    "sextuplet",
    "thirty_second",
  ] as const
).map((value) => ({ value, label: SUBDIVISION_LABELS[value] }));

const cleanlinessOptions = (["dirty", "almost", "clean"] as const).map(
  (value) => ({ value, label: CLEANLINESS_LABELS[value] }),
);

type Errors = Partial<Record<string, string[]>>;

export function LogForm({
  exercises: initialExercises,
  existingDates,
  initial = {},
  logId,
}: {
  exercises: PickerExercise[];
  /** Fechas en las que el usuario ya tiene día (no hace falta pedir el estado de ánimo). */
  existingDates: string[];
  initial?: LogFormInitial;
  /** Si se indica, el formulario corrige ese registro en vez de crear uno. */
  logId?: string;
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [knownDates, setKnownDates] = useState(existingDates);

  const [exerciseId, setExerciseId] = useState(initial.exerciseId);
  // Sin fecha explícita se usa "hoy" del dispositivo, que solo se conoce en el cliente.
  const [date, setDate] = useState(initial.date ?? "");
  const [today, setToday] = useState("");
  const [hand, setHand] = useState<Hand | undefined>(initial.hand ?? "right");
  const [bpm, setBpm] = useState(initial.bpm?.toString() ?? "");
  const [subdivision, setSubdivision] = useState<Subdivision | undefined>(
    initial.subdivision ?? "sixteenth",
  );
  const [minutes, setMinutes] = useState(
    initial.durationSeconds !== undefined
      ? Math.floor(initial.durationSeconds / 60).toString()
      : "",
  );
  const [seconds, setSeconds] = useState(
    initial.durationSeconds !== undefined
      ? (initial.durationSeconds % 60).toString()
      : "",
  );
  const [sets, setSets] = useState(initial.sets ?? 1);
  const [cleanliness, setCleanliness] = useState(initial.cleanliness);
  const [note, setNote] = useState(initial.note ?? "");
  const [noteOpen, setNoteOpen] = useState(Boolean(initial.note));
  const [mood, setMood] = useState<number>();

  const [errors, setErrors] = useState<Errors>({});
  const [askMood, setAskMood] = useState(false);
  const [saved, setSaved] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const now = localToday();
    setToday(now);
    setDate((current) => current || now);
  }, []);

  const needsMood = askMood || (date !== "" && !knownDates.includes(date));
  const exerciseName = exercises.find((e) => e.id === exerciseId)?.name;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(undefined);
    const values = {
      exerciseId: exerciseId ?? "",
      date,
      hand: hand ?? "",
      bpm,
      subdivision: subdivision ?? "",
      durationMinutes: minutes,
      durationSeconds: seconds,
      sets: String(sets),
      cleanliness: cleanliness ?? "",
      note: noteOpen ? note : "",
      mood: needsMood ? mood : undefined,
    };
    if (needsMood && mood === undefined) {
      setErrors({ mood: ["Indica tu estado de ánimo del día"] });
      setAskMood(true);
      return;
    }
    startTransition(async () => {
      const result: LogActionResult = logId
        ? await updateLogAction(logId, values)
        : await saveLogAction(values);
      switch (result.status) {
        case "invalid":
          setErrors(result.errors);
          return;
        case "needsMood":
          setErrors({ mood: ["Indica tu estado de ánimo del día"] });
          setAskMood(true);
          return;
        case "notFound":
          setErrors({ form: ["Este registro o ejercicio ya no existe"] });
          return;
        case "saved":
          setErrors({});
          if (logId) {
            router.push(`/historial/${result.date}`);
            return;
          }
          // Se conservan los valores para el siguiente registro (p. ej. subir el tempo).
          setKnownDates((dates) => [...dates, result.date]);
          setAskMood(false);
          setMood(undefined);
          setNote("");
          setNoteOpen(false);
          setSaved(`${exerciseName ?? "Registro"} a ${bpm} BPM`);
      }
    });
  }

  const error = (field: string) => errors[field]?.[0];

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <ExercisePicker
        exercises={exercises}
        value={exerciseId}
        onChange={setExerciseId}
        onCreated={(exercise) => setExercises((list) => [exercise, ...list])}
        error={error("exerciseId")}
      />

      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <Segmented
          label="Mano inicial"
          options={handOptions}
          value={hand}
          onChange={setHand}
          error={error("hand")}
        />
        <div className="space-y-1">
          <label htmlFor="date" className="block text-sm font-medium">
            Fecha
          </label>
          <input
            id="date"
            type="date"
            value={date}
            max={today || undefined}
            onChange={(event) => {
              setDate(event.target.value);
              setAskMood(false);
            }}
            aria-invalid={Boolean(error("date")) || undefined}
            className={`${inputClass} py-2 text-sm`}
          />
        </div>
      </div>
      {error("date") ? (
        <p className="-mt-3 text-sm text-danger">{error("date")}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="bpm" className="block text-sm font-medium">
            BPM
          </label>
          <input
            id="bpm"
            inputMode="numeric"
            pattern="[0-9]*"
            value={bpm}
            onChange={(event) => setBpm(event.target.value)}
            aria-invalid={Boolean(error("bpm")) || undefined}
            className={`${inputClass} text-lg font-semibold ${error("bpm") ? "border-danger" : ""}`}
            placeholder="120"
          />
        </div>
        <div className="space-y-1">
          <span className="block text-sm font-medium">Series</span>
          <div className="flex items-center rounded-lg border border-border bg-surface">
            <button
              type="button"
              aria-label="Una serie menos"
              onClick={() => setSets((n) => Math.max(1, n - 1))}
              className="px-4 py-2 text-lg"
            >
              −
            </button>
            <output
              aria-live="polite"
              className="flex-1 text-center text-lg font-semibold"
            >
              {sets}
            </output>
            <button
              type="button"
              aria-label="Una serie más"
              onClick={() => setSets((n) => Math.min(99, n + 1))}
              className="px-4 py-2 text-lg"
            >
              +
            </button>
          </div>
        </div>
      </div>
      {error("bpm") ? (
        <p className="-mt-3 text-sm text-danger">{error("bpm")}</p>
      ) : null}

      <Segmented
        label="Subdivisión"
        options={subdivisionOptions}
        value={subdivision}
        onChange={setSubdivision}
        columns={3}
        error={error("subdivision")}
      />

      <div className="grid grid-cols-[auto_1fr] items-start gap-3">
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">Duración por serie</legend>
          <div className="flex items-center gap-1">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Minutos"
              placeholder="min"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className={`${inputClass} w-16 text-center ${error("durationMinutes") ? "border-danger" : ""}`}
            />
            <span aria-hidden className="text-lg font-semibold">
              :
            </span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Segundos"
              placeholder="seg"
              value={seconds}
              onChange={(event) => setSeconds(event.target.value)}
              className={`${inputClass} w-16 text-center ${error("durationSeconds") ? "border-danger" : ""}`}
            />
          </div>
          {error("durationMinutes") || error("durationSeconds") ? (
            <p className="text-sm text-danger">
              {error("durationMinutes") ?? error("durationSeconds")}
            </p>
          ) : null}
        </fieldset>
        <Segmented
          label="Limpieza"
          options={cleanlinessOptions}
          value={cleanliness}
          onChange={setCleanliness}
          error={error("cleanliness")}
        />
      </div>

      {noteOpen ? (
        <div className="space-y-1">
          <label htmlFor="note" className="block text-sm font-medium">
            Nota del ejercicio
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={2000}
            className={inputClass}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="text-sm font-medium text-accent"
        >
          + Añadir nota
        </button>
      )}

      {needsMood ? (
        <MoodPicker
          value={mood}
          onChange={(value) => {
            setMood(value);
            setErrors(({ mood: _mood, ...rest }) => rest);
          }}
          label={
            date && date !== today
              ? `Estado de ánimo del ${formatDay(date)}`
              : "Estado de ánimo de hoy"
          }
          error={error("mood")}
        />
      ) : null}

      {error("form") ? (
        <p role="alert" className="text-sm text-danger">
          {error("form")}
        </p>
      ) : null}
      {saved ? (
        <output className="block rounded-lg bg-accent/10 px-3 py-2 text-sm font-medium">
          ✓ Guardado: {saved}. Puedes registrar el siguiente.
        </output>
      ) : null}

      <PrimaryButton type="submit" disabled={pending || !date}>
        {pending ? "Guardando…" : logId ? "Guardar cambios" : "Guardar"}
      </PrimaryButton>
    </form>
  );
}
