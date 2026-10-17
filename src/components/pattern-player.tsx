"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Subdivision } from "@/db/schema";
import { SUBDIVISION_LABELS } from "@/lib/labels";
import { Metronome } from "@/lib/metronome";
import {
  type Dynamic,
  forLeadHand,
  type Pattern,
  type PatternHand,
  stepAt,
} from "@/lib/pattern";
import { NOTES_PER_BEAT } from "@/lib/records";
import type { SoundSettings } from "@/lib/sound-settings";
import { MinusIcon, PlayIcon, PlusIcon, StopIcon } from "./icons";
import { PatternGrid } from "./pattern-grid";

const MIN_BPM = 30;
const MAX_BPM = 200;

/** Tempo de partida cómodo para oír el patrón según su subdivisión. */
const START_BPM: Record<Subdivision, number> = {
  quarter: 120,
  eighth: 100,
  triplet: 90,
  sixteenth: 80,
  sextuplet: 60,
  thirty_second: 50,
};

const DYNAMIC_LABELS: Record<Dynamic, string> = {
  accent: "Acento",
  normal: "Normal",
  ghost: "Ghost",
};

const HAND_TEXT: Record<PatternHand, { letter: string; color: string }> = {
  R: { letter: "D", color: "text-right-hand" },
  L: { letter: "I", color: "text-left-hand" },
};

/**
 * Paso del patrón que está sonando, leído del reloj del metrónomo en cada
 * fotograma. Solo provoca un render cuando cambia el paso.
 */
export function useSoundingStep(
  engine: Metronome,
  playing: boolean,
  length: number,
) {
  const [step, setStep] = useState<number>();
  useEffect(() => {
    if (!playing || !length) {
      setStep(undefined);
      return;
    }
    let frame = 0;
    const loop = () => {
      const tick = engine.current();
      setStep(tick ? stepAt(tick.index, length) : undefined);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engine, playing, length]);
  return step;
}

/**
 * Reproductor del patrón sobre panel de aparato: caja con el kit del usuario,
 * tempo, mano inicial y una leyenda que suena para comparar las fuerzas.
 */
export function PatternPlayer({
  pattern,
  sound,
  className,
}: {
  pattern: Pattern;
  sound: Pick<SoundSettings, "soundKit" | "ghostVolume">;
  className?: string;
}) {
  const [engine] = useState(() => new Metronome());
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(START_BPM[pattern.subdivision]);
  const [lead, setLead] = useState<PatternHand>("R");
  const notesPerBeat = NOTES_PER_BEAT[pattern.subdivision];
  const steps = forLeadHand(pattern, lead).steps;
  const step = useSoundingStep(engine, playing, steps.length);
  const current = step === undefined ? undefined : steps[step];

  useEffect(() => {
    engine.bpm = bpm;
    engine.notesPerBeat = notesPerBeat;
    engine.pattern = steps;
    engine.sound = "pattern";
    engine.kit = sound.soundKit;
    engine.ghostVolume = sound.ghostVolume;
  });
  useEffect(() => () => engine.close(), [engine]);

  async function toggle() {
    if (playing) {
      engine.stop();
      setPlaying(false);
      return;
    }
    await engine.start();
    setPlaying(true);
  }

  return (
    <section
      aria-label="Patrón"
      className={`relative overflow-hidden rounded-[28px] border border-panel-border bg-panel p-4 text-panel-foreground shadow-[0_30px_80px_-40px_rgb(0_0_0/0.8),inset_0_1px_0_rgb(255_255_255/0.06)] sm:p-6 ${className ?? ""}`}
    >
      <div
        aria-hidden="true"
        className="bg-ticks pointer-events-none absolute inset-x-0 top-0 h-2 text-panel-border"
      />

      <div className="label-mono flex items-center justify-between gap-3 text-panel-muted">
        <span className="flex items-center gap-2">
          <span
            className={`size-2 rounded-full ${
              playing
                ? "animate-blink bg-accent shadow-[0_0_10px_var(--accent)]"
                : "bg-panel-border"
            }`}
          />
          {SUBDIVISION_LABELS[pattern.subdivision]}
        </span>
        <span aria-live="off" className="whitespace-nowrap">
          {current ? (
            <>
              <span className={`font-display ${HAND_TEXT[current.hand].color}`}>
                {HAND_TEXT[current.hand].letter}
              </span>{" "}
              · {DYNAMIC_LABELS[current.dynamic]}
            </>
          ) : playing ? (
            "Silencio"
          ) : (
            "En pausa"
          )}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={playing}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-5 font-semibold text-accent-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_30px_-12px_var(--accent)] transition-transform duration-200 active:scale-95"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={playing ? "stop" : "play"}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
            >
              {playing ? <StopIcon size={18} /> : <PlayIcon size={18} />}
            </motion.span>
          </AnimatePresence>
          {playing ? "Parar" : "Escuchar"}
        </button>

        <div className="flex items-center gap-2">
          <RoundButton
            label="Más lento"
            onClick={() => setBpm((value) => Math.max(MIN_BPM, value - 5))}
          >
            <MinusIcon size={18} />
          </RoundButton>
          <p className="min-w-[3ch] text-center font-display text-3xl leading-none tabular-nums">
            {bpm}
          </p>
          <RoundButton
            label="Más rápido"
            onClick={() => setBpm((value) => Math.min(MAX_BPM, value + 5))}
          >
            <PlusIcon size={18} />
          </RoundButton>
          <span className="label-mono text-panel-muted">BPM</span>
        </div>

        <fieldset className="ml-auto flex items-center gap-2">
          <legend className="sr-only">Mano inicial</legend>
          <span aria-hidden="true" className="label-mono text-panel-muted">
            Empieza
          </span>
          <span className="flex rounded-xl border border-panel-border bg-panel-2 p-0.5">
            {(["R", "L"] as const).map((hand) => (
              <label
                key={hand}
                className={`grid h-9 w-10 cursor-pointer place-items-center rounded-[10px] font-display text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-accent ${
                  lead === hand
                    ? `bg-panel-border ${HAND_TEXT[hand].color}`
                    : "text-panel-muted"
                }`}
              >
                <input
                  type="radio"
                  name="lead-hand"
                  value={hand}
                  checked={lead === hand}
                  onChange={() => setLead(hand)}
                  className="sr-only"
                />
                <span aria-hidden="true">{HAND_TEXT[hand].letter}</span>
                <span className="sr-only">
                  {hand === "R" ? "Derecha" : "Izquierda"}
                </span>
              </label>
            ))}
          </span>
        </fieldset>
      </div>

      <div className="mt-5">
        <PatternGrid
          pattern={pattern}
          steps={steps}
          notesPerBeat={notesPerBeat}
          active={step}
        />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-dashed border-panel-border pt-4">
        {(["accent", "normal", "ghost"] as const).map((dynamic) => (
          <button
            key={dynamic}
            type="button"
            onClick={() => engine.preview({ hand: lead, dynamic })}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-panel-border bg-panel-2 px-2 py-2 text-sm font-medium transition-[transform,border-color] duration-150 hover:border-panel-muted active:scale-95"
          >
            <DynamicSwatch dynamic={dynamic} />
            {DYNAMIC_LABELS[dynamic]}
          </button>
        ))}
      </div>
    </section>
  );
}

/** Muestra de la forma de cada fuerza, igual que en la cuadrícula. */
export function DynamicSwatch({ dynamic }: { dynamic: Dynamic }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-6 shrink-0 place-items-center rounded-md bg-panel"
    >
      {dynamic === "accent" ? (
        <span className="grid size-5 place-items-center rounded bg-accent font-display text-[10px] leading-none text-white">
          &gt;
        </span>
      ) : dynamic === "normal" ? (
        <span className="h-2.5 w-3 rounded-[3px] bg-accent/75" />
      ) : (
        <span className="h-2 w-2.5 rounded-full border-2 border-accent/70" />
      )}
    </span>
  );
}

function RoundButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-xl border border-panel-border bg-panel-2 transition-transform duration-150 active:scale-90"
    >
      {children}
    </button>
  );
}
