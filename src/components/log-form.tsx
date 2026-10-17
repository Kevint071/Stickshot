"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
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
import { bpmFor, NOTES_PER_BEAT } from "@/lib/records";
import type { PickerExercise } from "@/server/exercises";
import type { ExerciseTarget } from "@/server/progress";
import { ExercisePicker } from "./exercise-picker";
import { MetronomeIcon, MinusIcon, NoteIcon, PlusIcon } from "./icons";
import { MoodPicker } from "./mood-picker";
import { PracticeConsole, type Serie } from "./practice-console";
import { RecordCelebration, type SaveFeedback } from "./record-celebration";
import { Segmented } from "./segmented";
import { cardClass, inputClass, PrimaryButton, Pulse } from "./ui";

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

const DEFAULT_PRACTICE_BPM = 100;

type Errors = Partial<Record<string, string[]>>;

/** Récord de un ejercicio y mano expresado en BPM de la subdivisión dada. */
function recordBpm(
  targets: Record<string, ExerciseTarget> | undefined,
  exerciseId: string | undefined,
  hand: Hand,
  subdivision: Subdivision,
) {
  const value = exerciseId ? targets?.[exerciseId]?.records[hand] : undefined;
  return value === undefined ? undefined : bpmFor(value, subdivision);
}

export function LogForm({
  exercises: initialExercises,
  existingDates,
  initial = {},
  logId,
  targets,
}: {
  exercises: PickerExercise[];
  /** Fechas en las que el usuario ya tiene día (no hace falta pedir el estado de ánimo). */
  existingDates: string[];
  initial?: LogFormInitial;
  /** Si se indica, el formulario corrige ese registro en vez de crear uno. */
  logId?: string;
  /** Récords por ejercicio: con ellos el formulario va junto al metrónomo. */
  targets?: Record<string, ExerciseTarget>;
}) {
  const router = useRouter();
  const practiceMode = targets !== undefined;
  const [exercises, setExercises] = useState(initialExercises);
  const [knownDates, setKnownDates] = useState(existingDates);

  const [exerciseId, setExerciseId] = useState(initial.exerciseId);
  // Sin fecha explícita se usa "hoy" del dispositivo, que solo se conoce en el cliente.
  const [date, setDate] = useState(initial.date ?? "");
  const [today, setToday] = useState("");
  const [hand, setHand] = useState<Hand | undefined>(initial.hand ?? "right");
  // Al practicar se arranca en el récord del ejercicio (o en un tempo cómodo).
  const [bpm, setBpm] = useState(
    initial.bpm?.toString() ??
      (practiceMode
        ? String(
            recordBpm(
              targets,
              initial.exerciseId,
              initial.hand ?? "right",
              initial.subdivision ?? "sixteenth",
            ) ?? DEFAULT_PRACTICE_BPM,
          )
        : ""),
  );
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
  const [series, setSeries] = useState<Serie[]>([]);

  const [errors, setErrors] = useState<Errors>({});
  const [askMood, setAskMood] = useState(false);
  const [feedback, setFeedback] = useState<SaveFeedback>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const now = localToday();
    setToday(now);
    setDate((current) => current || now);
  }, []);

  const needsMood = askMood || (date !== "" && !knownDates.includes(date));
  const exercise = exercises.find((e) => e.id === exerciseId);
  const bpmNumber = Number(bpm) || DEFAULT_PRACTICE_BPM;
  const target = exerciseId ? targets?.[exerciseId] : undefined;
  const currentRecordBpm =
    hand && subdivision
      ? recordBpm(targets, exerciseId, hand, subdivision)
      : undefined;
  const record =
    target && currentRecordBpm !== undefined
      ? { bpm: currentRecordBpm, tier: target.tier }
      : undefined;

  function chooseExercise(id: string) {
    setExerciseId(id);
    // Sin series en marcha, el metrónomo salta al récord del nuevo ejercicio.
    if (practiceMode && series.length === 0 && hand && subdivision) {
      const start = recordBpm(targets, id, hand, subdivision);
      if (start !== undefined) setBpm(String(start));
    }
  }
  const fromMetronome = series.some((serie) => serie.bpm === bpmNumber);

  const changeBpm = useCallback((value: number) => setBpm(String(value)), []);

  /** Cada serie del metrónomo rellena tempo, duración (la más corta) y series. */
  const receiveSeries = useCallback((next: Serie[]) => {
    setSeries(next);
    const last = next.at(-1);
    if (!last) return;
    const same = next.filter((serie) => serie.bpm === last.bpm);
    const shortest = Math.min(...same.map((serie) => serie.seconds));
    setBpm(String(last.bpm));
    setMinutes(String(Math.floor(shortest / 60)));
    setSeconds(String(shortest % 60));
    setSets(Math.min(99, same.length));
    setErrors(
      ({ bpm: _b, durationSeconds: _d, durationMinutes: _m, ...rest }) => rest,
    );
  }, []);

  const closeFeedback = useCallback(() => setFeedback(undefined), []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(undefined);
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
          setSeries([]);
          setFeedback({
            id: Date.now(),
            title: `${exercise?.name ?? "Registro"} a ${bpm} BPM`,
            records: result.records,
          });
      }
    });
  }

  const error = (field: string) => errors[field]?.[0];

  const form = (
    <form
      onSubmit={submit}
      noValidate
      className={`${cardClass} animate-rise space-y-6 p-5 sm:p-7`}
      style={{ "--i": 2 } as React.CSSProperties}
    >
      <ExercisePicker
        exercises={exercises}
        value={exerciseId}
        onChange={chooseExercise}
        onCreated={(created) => setExercises((list) => [created, ...list])}
        error={error("exerciseId")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Segmented
          label="Mano inicial"
          options={handOptions}
          value={hand}
          onChange={setHand}
          error={error("hand")}
        />
        <div className="space-y-1.5">
          <label htmlFor="date" className="label-mono block text-muted">
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
            className={`${inputClass} py-2.5 text-sm`}
          />
          {error("date") ? (
            <p className="text-sm text-danger">{error("date")}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="bpm" className="label-mono block text-muted">
            BPM
          </label>
          <input
            id="bpm"
            inputMode="numeric"
            pattern="[0-9]*"
            value={bpm}
            onChange={(event) => setBpm(event.target.value)}
            aria-invalid={Boolean(error("bpm")) || undefined}
            className={`${inputClass} font-display text-2xl tabular-nums ${error("bpm") ? "border-danger" : ""}`}
            placeholder="120"
          />
          {error("bpm") ? (
            <p className="text-sm text-danger">{error("bpm")}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <span className="label-mono block text-muted">Series</span>
          <div className="flex items-center rounded-xl border border-border bg-surface">
            <button
              type="button"
              aria-label="Una serie menos"
              onClick={() => setSets((n) => Math.max(1, n - 1))}
              className="grid size-12 place-items-center rounded-l-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground active:scale-90"
            >
              <MinusIcon size={18} />
            </button>
            <output
              aria-live="polite"
              className="flex-1 overflow-hidden text-center"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={sets}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 600, damping: 32 }}
                  className="inline-block font-display text-2xl tabular-nums"
                >
                  {sets}
                </motion.span>
              </AnimatePresence>
            </output>
            <button
              type="button"
              aria-label="Una serie más"
              onClick={() => setSets((n) => Math.min(99, n + 1))}
              className="grid size-12 place-items-center rounded-r-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground active:scale-90"
            >
              <PlusIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      <Segmented
        label="Subdivisión"
        options={subdivisionOptions}
        value={subdivision}
        onChange={setSubdivision}
        columns={2}
        wideColumns={3}
        error={error("subdivision")}
      />

      <div className="space-y-6">
        <fieldset className="space-y-1.5">
          <legend className="label-mono mb-1.5 flex items-center gap-2 text-muted">
            Duración por serie
            <AnimatePresence>
              {fromMetronome ? (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent-ink normal-case tracking-normal"
                >
                  <MetronomeIcon size={11} /> del metrónomo
                </motion.span>
              ) : null}
            </AnimatePresence>
          </legend>
          <div className="flex max-w-64 items-center gap-1.5">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Minutos"
              placeholder="min"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className={`${inputClass} text-center font-display text-xl tabular-nums ${error("durationMinutes") ? "border-danger" : ""}`}
            />
            <span aria-hidden="true" className="font-display text-xl">
              :
            </span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Segundos"
              placeholder="seg"
              value={seconds}
              onChange={(event) => setSeconds(event.target.value)}
              className={`${inputClass} text-center font-display text-xl tabular-nums ${error("durationSeconds") ? "border-danger" : ""}`}
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

      <AnimatePresence initial={false} mode="wait">
        {noteOpen ? (
          <motion.div
            key="note"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-1.5 overflow-hidden"
          >
            <label htmlFor="note" className="label-mono block text-muted">
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
          </motion.div>
        ) : (
          <motion.button
            key="add-note"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNoteOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-80"
          >
            <NoteIcon size={16} /> Añadir nota
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {needsMood ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <MoodPicker
              value={mood}
              onChange={(value) => {
                setMood(value);
                setErrors(({ mood: _mood, ...rest }) => rest);
              }}
              label={
                date && date !== today
                  ? `¿Cómo te sentiste el ${formatDay(date)}?`
                  : "¿Cómo te sentiste hoy?"
              }
              error={error("mood")}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error("form") ? (
        <p role="alert" className="text-sm text-danger">
          {error("form")}
        </p>
      ) : null}

      <PrimaryButton type="submit" disabled={pending || !date}>
        {pending ? (
          <>
            Guardando <Pulse />
          </>
        ) : logId ? (
          "Guardar cambios"
        ) : (
          "Guardar registro"
        )}
      </PrimaryButton>
    </form>
  );

  return (
    <>
      {practiceMode ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-8">
          <div
            className="animate-rise lg:sticky lg:top-10"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            <PracticeConsole
              bpm={bpmNumber}
              onBpmChange={changeBpm}
              notesPerBeat={subdivision ? NOTES_PER_BEAT[subdivision] : 4}
              exerciseName={exercise?.name}
              record={record}
              series={series}
              onSeries={receiveSeries}
            />
          </div>
          {form}
        </div>
      ) : (
        <div className="max-w-2xl">{form}</div>
      )}
      <RecordCelebration feedback={feedback} onClose={closeFeedback} />
    </>
  );
}
