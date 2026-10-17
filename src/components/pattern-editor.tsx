"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useReducer, useState, useTransition } from "react";
import { savePatternAction } from "@/lib/actions/patterns";
import { SUBDIVISION_LABELS } from "@/lib/labels";
import { Metronome } from "@/lib/metronome";
import {
  DYNAMICS,
  type Dynamic,
  MAX_STEPS,
  type Ornament,
  type Pattern,
  type PatternHand,
} from "@/lib/pattern";
import {
  canAdd,
  draftPattern,
  editorReducer,
  initEditor,
} from "@/lib/pattern/editor";
import { NOTES_PER_BEAT } from "@/lib/records";
import type { SoundSettings } from "@/lib/sound-settings";
import { CheckIcon, PlayIcon, PlusIcon, StopIcon } from "./icons";
import { PatternGrid } from "./pattern-grid";
import { DynamicSwatch, useSoundingStep } from "./pattern-player";
import { Segmented } from "./segmented";
import { cardClass, Pulse } from "./ui";

const DYNAMIC_LABELS: Record<Dynamic, string> = {
  ghost: "Ghost",
  normal: "Normal",
  accent: "Acento",
};

const ORNAMENT_OPTIONS: { value: Ornament | undefined; label: string }[] = [
  { value: undefined, label: "Ninguno" },
  { value: "flam", label: "Flam" },
  { value: "drag", label: "Drag" },
  { value: "buzz", label: "Buzz" },
];

const subdivisionOptions = Object.keys(NOTES_PER_BEAT).map((value) => ({
  value: value as Pattern["subdivision"],
  label: SUBDIVISION_LABELS[value as Pattern["subdivision"]],
}));

const LEAVE_WARNING =
  "Tienes cambios sin guardar en el patrón. ¿Salir igualmente?";

/**
 * Editor de patrones para el móvil: la cuadrícula arriba y, fija abajo al
 * alcance del pulgar, la barra con mano, fuerza, adorno y acciones.
 */
export function PatternEditor({
  exerciseId,
  initial,
  sound,
}: {
  exerciseId: string;
  initial: Pattern | null;
  sound: Pick<SoundSettings, "soundKit" | "ghostVolume">;
}) {
  const [state, dispatch] = useReducer(editorReducer, initial, initEditor);
  const [engine] = useState(() => new Metronome());
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [saving, startSave] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const draft = draftPattern(state);
  const notesPerBeat = NOTES_PER_BEAT[state.subdivision];
  const step = useSoundingStep(engine, playing, state.steps.length);
  const full = !canAdd(state);
  const selectedStep =
    state.selected === undefined ? undefined : state.steps[state.selected];

  useEffect(() => {
    engine.bpm = bpm;
    engine.notesPerBeat = notesPerBeat;
    engine.pattern = state.steps;
    engine.sound = "pattern";
    engine.kit = sound.soundKit;
    engine.ghostVolume = sound.ghostVolume;
  });
  useEffect(() => () => engine.close(), [engine]);

  // Sin golpes no hay nada que sonar.
  useEffect(() => {
    if (!draft && playing) {
      engine.stop();
      setPlaying(false);
    }
  }, [draft, playing, engine]);

  // Aviso al salir con cambios: al cerrar o recargar, y al seguir un enlace de la app.
  useEffect(() => {
    if (!state.dirty) return;
    const onUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest("a[href]");
      if (!link || link.getAttribute("target") === "_blank") return;
      if (!window.confirm(LEAVE_WARNING)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [state.dirty]);

  async function toggle() {
    if (playing) {
      engine.stop();
      setPlaying(false);
      return;
    }
    if (!draft) return;
    await engine.start();
    setPlaying(true);
  }

  function save() {
    if (!draft) return;
    setMessage(undefined);
    startSave(async () => {
      const result = await savePatternAction(exerciseId, draft);
      if (result.ok) {
        dispatch({ type: "saved" });
        setMessage({ ok: true, text: "Patrón guardado" });
      } else {
        setMessage({
          ok: false,
          text:
            "error" in result
              ? result.error
              : "No se encontró el ejercicio. Recarga la página.",
        });
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section
        aria-label="Patrón"
        className="relative overflow-hidden rounded-[28px] border border-panel-border bg-panel p-4 text-panel-foreground shadow-[0_30px_80px_-40px_rgb(0_0_0/0.8),inset_0_1px_0_rgb(255_255_255/0.06)] sm:p-6"
      >
        <div
          aria-hidden="true"
          className="bg-ticks pointer-events-none absolute inset-x-0 top-0 h-2 text-panel-border"
        />
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggle}
            disabled={!draft}
            aria-pressed={playing}
            aria-label={playing ? "Parar" : "Escuchar"}
            className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-panel-border bg-panel-2 px-3 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-40 sm:px-4"
          >
            {playing ? <StopIcon size={16} /> : <PlayIcon size={16} />}
            <span className="hidden sm:inline">
              {playing ? "Parar" : "Escuchar"}
            </span>
          </button>
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              aria-label="Más lento"
              onClick={() => setBpm((value) => Math.max(30, value - 5))}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-panel-border bg-panel-2 text-lg active:scale-90 sm:size-11"
            >
              −
            </button>
            <span className="min-w-[3ch] text-center font-display text-2xl tabular-nums">
              {bpm}
            </span>
            <button
              type="button"
              aria-label="Más rápido"
              onClick={() => setBpm((value) => Math.min(200, value + 5))}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-panel-border bg-panel-2 text-lg active:scale-90 sm:size-11"
            >
              +
            </button>
            <span className="label-mono hidden text-panel-muted sm:inline">
              BPM
            </span>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!draft || saving || !state.dirty}
            className="ml-auto inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3.5 sm:px-5 text-sm font-semibold text-accent-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_30px_-12px_var(--accent)] transition-transform active:scale-95 disabled:opacity-50"
          >
            {saving ? <Pulse /> : <CheckIcon size={16} />}
            {state.dirty || !initial ? "Guardar" : "Guardado"}
          </button>
        </div>

        <AnimatePresence>
          {message ? (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
              className={`mt-3 text-sm ${message.ok ? "text-success" : "text-danger"}`}
            >
              {message.text}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <div className="mt-5">
          {state.steps.length ? (
            <PatternGrid
              pattern={{ steps: state.steps, subdivision: state.subdivision }}
              notesPerBeat={notesPerBeat}
              active={step}
              selected={state.selected}
              onSelect={(index) => dispatch({ type: "select", index })}
            />
          ) : (
            <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-panel-border p-6 text-center text-sm text-panel-muted">
              Elige mano y fuerza abajo y toca «Añadir golpe». Cada golpe es un
              paso; el patrón se repite en bucle.
            </div>
          )}
        </div>
        <p className="label-mono mt-4 text-panel-muted">
          {state.steps.length}/{MAX_STEPS} pasos
          {state.selected !== undefined
            ? ` · editando el paso ${state.selected + 1}`
            : ""}
        </p>
      </section>

      <Segmented
        label="Subdivisión natural"
        options={subdivisionOptions}
        value={state.subdivision}
        onChange={(subdivision) =>
          dispatch({ type: "setSubdivision", subdivision })
        }
        columns={3}
        wideColumns={6}
      />

      {/* Barra de herramientas: fija abajo, encima de la navegación del móvil. */}
      <section
        aria-label="Herramientas del patrón"
        className={`${cardClass} sticky bottom-[calc(6rem+env(safe-area-inset-bottom))] z-20 space-y-3 p-3 shadow-[0_18px_50px_-20px_rgb(0_0_0/0.5)] sm:p-4 lg:bottom-6`}
      >
        <p className="text-xs text-muted">
          {state.selected === undefined
            ? "Lo que elijas se añade al final."
            : selectedStep === null
              ? `Paso ${state.selected + 1}: silencio. Elige mano o fuerza para convertirlo en golpe; toca el paso otra vez para soltarlo.`
              : `Editando el paso ${state.selected + 1}: los cambios se aplican al momento. «Añadir» inserta detrás.`}
        </p>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
          <span className="label-mono text-muted">Mano</span>
          <ToolGroup label="Mano">
            {(["R", "L"] as PatternHand[]).map((hand) => (
              <ToolButton
                key={hand}
                active={state.tool.hand === hand}
                onClick={() => dispatch({ type: "setTool", tool: { hand } })}
                tone={hand === "R" ? "right" : "left"}
              >
                <span className="font-display">{hand === "R" ? "D" : "I"}</span>
                <span className="text-xs font-normal opacity-80">
                  {hand === "R" ? "Derecha" : "Izquierda"}
                </span>
              </ToolButton>
            ))}
          </ToolGroup>

          <span className="label-mono text-muted">Fuerza</span>
          <ToolGroup label="Fuerza">
            {DYNAMICS.map((dynamic) => (
              <ToolButton
                key={dynamic}
                active={state.tool.dynamic === dynamic}
                onClick={() => dispatch({ type: "setTool", tool: { dynamic } })}
              >
                <DynamicSwatch dynamic={dynamic} />
                {DYNAMIC_LABELS[dynamic]}
              </ToolButton>
            ))}
          </ToolGroup>

          <span className="label-mono text-muted">Adorno</span>
          <ToolGroup label="Adorno">
            {ORNAMENT_OPTIONS.map(({ value, label }) => (
              <ToolButton
                key={label}
                active={state.tool.ornament === value}
                onClick={() =>
                  dispatch({ type: "setTool", tool: { ornament: value } })
                }
              >
                {label}
              </ToolButton>
            ))}
          </ToolGroup>
        </div>

        <div className="grid grid-cols-[1fr_1fr_1.6fr] gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "remove" })}
            disabled={state.selected === undefined}
            className="h-12 rounded-xl border border-danger/40 text-sm font-medium text-danger transition-[transform,background-color] hover:bg-danger/10 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            Borrar
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "addRest" })}
            disabled={full}
            className="h-12 rounded-xl border border-border-strong text-sm font-medium transition-[transform,border-color] hover:border-foreground/40 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            Silencio
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "addStroke" })}
            disabled={full}
            className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-accent text-sm font-semibold text-accent-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_30px_-12px_var(--accent)] transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            <PlusIcon size={18} /> Añadir golpe
          </button>
        </div>
        {full ? (
          <p className="text-xs text-danger">
            Has llegado al máximo de {MAX_STEPS} pasos: borra alguno para añadir
            más.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ToolGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex min-w-0 gap-1 rounded-xl border border-border bg-surface-2/60 p-1">
      <legend className="sr-only">{label}</legend>
      {children}
    </fieldset>
  );
}

function ToolButton({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: "right" | "left";
  children: React.ReactNode;
}) {
  const activeTone =
    tone === "right"
      ? "bg-right-hand text-white"
      : tone === "left"
        ? "bg-left-hand text-white"
        : "bg-surface text-foreground shadow-[0_4px_12px_-8px_rgb(0_0_0/0.5)]";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-95 ${
        active ? activeTone : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
