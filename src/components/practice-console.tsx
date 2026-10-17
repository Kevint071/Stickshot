"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { PracticeSound } from "@/db/schema";
import { saveSoundSettingsAction } from "@/lib/actions/sound";
import { tierLabel } from "@/lib/labels";
import { Metronome, tapTempo } from "@/lib/metronome";
import { forLeadHand, type Pattern, type PatternHand } from "@/lib/pattern";
import type { Tier } from "@/lib/records";
import {
  DEFAULT_SOUND_SETTINGS,
  type SoundSettings,
} from "@/lib/sound-settings";
import { challengeStep } from "@/lib/stats";
import {
  MinusIcon,
  PlayIcon,
  PlusIcon,
  ResetIcon,
  StopIcon,
  TapIcon,
  TrophyIcon,
  VolumeIcon,
} from "./icons";
import { PatternGrid } from "./pattern-grid";
import { useSoundingStep } from "./pattern-player";

export type Serie = { bpm: number; seconds: number };

const SOUND_MODES: { value: PracticeSound; label: string }[] = [
  { value: "click", label: "Clic" },
  { value: "pattern", label: "Patrón" },
  { value: "both", label: "Ambos" },
];

const MIN_BPM = 20;
const MAX_BPM = 400;
const SLIDER_MAX = 300;
const MAX_SWING_DEG = 26;
/** Series más cortas que esto se consideran arranques en falso. */
const MIN_SERIE_SECONDS = 3;

const clamp = (bpm: number) =>
  Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));

function formatClock(seconds: number) {
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Consola de práctica: metrónomo con péndulo, cronómetro de la serie y reto
 * sobre el récord. Al parar, la serie se pasa al formulario de registro.
 */
export function PracticeConsole({
  bpm,
  onBpmChange,
  notesPerBeat,
  exerciseName,
  record,
  series,
  onSeries,
  pattern,
  lead = "R",
  sound = DEFAULT_SOUND_SETTINGS,
}: {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  notesPerBeat: number;
  exerciseName?: string;
  /** Patrón del ejercicio elegido, si tiene. */
  pattern?: Pattern | null;
  /** Mano inicial del formulario: el patrón se toca en espejo si es la izquierda. */
  lead?: PatternHand;
  sound?: SoundSettings;
  /** Récord del ejercicio para la mano y subdivisión elegidas, en BPM. */
  record?: { bpm: number; tier: Tier };
  series: Serie[];
  onSeries: (series: Serie[]) => void;
}) {
  const [engine] = useState(() => new Metronome());
  const [playing, setPlaying] = useState(false);
  const [subAudible, setSubAudible] = useState(true);
  const [mode, setMode] = useState(sound.practiceSound);
  const [, startSaveMode] = useTransition();
  const steps = pattern ? forLeadHand(pattern, lead).steps : undefined;
  const step = useSoundingStep(engine, playing, steps?.length ?? 0);
  const taps = useRef<number[]>([]);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const armRef = useRef<SVGGElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    engine.bpm = bpm;
  }, [engine, bpm]);
  useEffect(() => {
    engine.notesPerBeat = notesPerBeat;
  }, [engine, notesPerBeat]);
  useEffect(() => {
    engine.subdivisionAudible = subAudible;
  }, [engine, subAudible]);
  // Sin patrón el motor toca siempre el clic, sea cual sea el modo guardado.
  useEffect(() => {
    engine.pattern = steps;
    engine.sound = mode;
    engine.kit = sound.soundKit;
    engine.ghostVolume = sound.ghostVolume;
  });

  function chooseMode(next: PracticeSound) {
    const previous = mode;
    setMode(next);
    startSaveMode(async () => {
      const result = await saveSoundSettingsAction({ practiceSound: next });
      if (!result.ok) setMode(previous);
    });
  }
  useEffect(() => () => engine.close(), [engine]);

  // Bucle visual: lee el último clic que ha sonado y mueve péndulo, LEDs y reloj.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let lastBeat = -1;
    const loop = () => {
      const tick = engine.current();
      if (tick) {
        const beatSeconds = 60 / engine.bpm;
        // El último clic puede ser una subdivisión: se retrocede hasta su pulso.
        const beatTime =
          tick.time - (tick.sub * beatSeconds) / engine.notesPerBeat;
        const progress = Math.min(1, (engine.now() - beatTime) / beatSeconds);
        // En cada pulso el brazo toca un extremo, como la baqueta en el parche.
        const swing =
          MAX_SWING_DEG * Math.cos(Math.PI * (tick.beat + progress));
        armRef.current?.setAttribute("transform", `rotate(${swing} 100 172)`);
        if (tick.beat !== lastBeat) {
          lastBeat = tick.beat;
          const dots = dotsRef.current?.children;
          if (dots) {
            for (let i = 0; i < dots.length; i += 1) {
              (dots[i] as HTMLElement).dataset.on = String(
                i === tick.beatInBar,
              );
            }
          }
          ringRef.current?.animate(
            [
              {
                transform: "scale(1)",
                opacity: tick.beatInBar === 0 ? 0.7 : 0.4,
              },
              { transform: "scale(1.7)", opacity: 0 },
            ],
            { duration: Math.min(600, beatSeconds * 900), easing: "ease-out" },
          );
        }
      }
      if (clockRef.current)
        clockRef.current.textContent = formatClock(engine.elapsed());
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engine, playing]);

  const start = useCallback(async () => {
    await engine.start();
    setPlaying(true);
    try {
      wakeLock.current = await navigator.wakeLock?.request("screen");
    } catch {
      // Sin permiso para mantener la pantalla: no es crítico.
    }
  }, [engine]);

  const stop = useCallback(() => {
    const seconds = Math.min(3599, Math.round(engine.stop()));
    setPlaying(false);
    void wakeLock.current?.release();
    wakeLock.current = null;
    armRef.current?.setAttribute("transform", "rotate(0 100 172)");
    for (const dot of Array.from(dotsRef.current?.children ?? [])) {
      (dot as HTMLElement).dataset.on = "false";
    }
    if (seconds >= MIN_SERIE_SECONDS) {
      onSeries([...series, { bpm: engine.bpm, seconds }]);
    }
  }, [engine, onSeries, series]);

  const toggle = useCallback(() => {
    if (engine.playing) stop();
    else void start();
  }, [engine, start, stop]);

  function tap() {
    const now = performance.now();
    if (taps.current.length && now - (taps.current.at(-1) ?? 0) > 2000) {
      taps.current = [];
    }
    taps.current.push(now);
    const tempo = tapTempo(taps.current);
    if (tempo) onBpmChange(clamp(tempo));
  }

  // Teclado: espacio arranca o para; flechas cambian el tempo (Mayús ×5).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, [role=dialog]"))
        return;
      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const step =
          (event.shiftKey ? 5 : 1) * (event.key === "ArrowUp" ? 1 : -1);
        onBpmChange(clamp(engine.bpm + step));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, toggle, onBpmChange]);

  const aboveRecord = record !== undefined && bpm > record.bpm;
  const challenge = record
    ? clamp(record.bpm + challengeStep(record.bpm))
    : undefined;
  // El contrapeso baja cuanto más rápido, como en un metrónomo de verdad.
  const weightY =
    52 + ((Math.min(bpm, SLIDER_MAX) - MIN_BPM) / (SLIDER_MAX - MIN_BPM)) * 80;
  const sliderPercent =
    ((Math.min(bpm, SLIDER_MAX) - MIN_BPM) / (SLIDER_MAX - MIN_BPM)) * 100;

  return (
    <section
      aria-label="Metrónomo"
      className="relative overflow-hidden rounded-[28px] border border-panel-border bg-panel p-5 text-panel-foreground shadow-[0_30px_80px_-40px_rgb(0_0_0/0.8),inset_0_1px_0_rgb(255_255_255/0.06)] sm:p-6"
    >
      {/* Rejilla de regla en el borde superior: la escala del aparato. */}
      <div
        aria-hidden="true"
        className="bg-ticks pointer-events-none absolute inset-x-0 top-0 h-2 text-panel-border"
      />

      <div className="flex items-center justify-between">
        <p className="label-mono flex items-center gap-2 text-panel-muted">
          <span
            className={`size-2 rounded-full ${
              playing
                ? "animate-blink bg-accent shadow-[0_0_10px_var(--accent)]"
                : "bg-panel-border"
            }`}
          />
          {playing ? "Tocando" : "Metrónomo"}
        </p>
        <p className="font-mono text-2xl tabular-nums text-panel-foreground">
          <span ref={clockRef}>00:00</span>
        </p>
      </div>

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-2">
        <svg
          viewBox="0 0 200 200"
          className="w-full max-w-56"
          aria-hidden="true"
        >
          <path
            d="M76 18h48l40 168H36z"
            fill="var(--panel-2)"
            stroke="var(--panel-border)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {Array.from({ length: 9 }, (_, i) => (
            <line
              // biome-ignore lint/suspicious/noArrayIndexKey: marcas fijas de la escala.
              key={i}
              x1={92}
              x2={108}
              y1={40 + i * 13}
              y2={40 + i * 13}
              stroke="var(--panel-border)"
              strokeWidth={i % 2 ? 1 : 2}
            />
          ))}
          <g ref={armRef} transform="rotate(0 100 172)">
            <line
              x1="100"
              y1="172"
              x2="100"
              y2="30"
              stroke="var(--panel-foreground)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <motion.rect
              x="88"
              width="24"
              height="16"
              rx="4"
              fill="var(--accent)"
              animate={{ y: weightY }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
            />
          </g>
          <circle cx="100" cy="172" r="6" fill="var(--panel-foreground)" />
        </svg>

        <div className="min-w-0 text-right">
          <motion.p
            key={bpm}
            initial={{ y: 8, opacity: 0.4 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
            className="font-display text-7xl leading-none tabular-nums sm:text-8xl"
            aria-live="polite"
          >
            {bpm}
          </motion.p>
          <p className="label-mono mt-1 text-panel-muted">BPM</p>
          <div ref={dotsRef} className="mt-4 flex justify-end gap-2">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                data-on="false"
                className={`size-3 rounded-full bg-panel-border transition-[background-color,transform,box-shadow] duration-75 data-[on=true]:scale-125 ${
                  i === 0
                    ? "data-[on=true]:bg-accent data-[on=true]:shadow-[0_0_14px_var(--accent)]"
                    : "data-[on=true]:bg-panel-foreground"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <BpmButton
          label="Bajar tempo"
          onClick={(step) => onBpmChange(clamp(bpm - step))}
        >
          <MinusIcon />
        </BpmButton>
        <input
          type="range"
          min={MIN_BPM}
          max={SLIDER_MAX}
          value={Math.min(bpm, SLIDER_MAX)}
          onChange={(event) => onBpmChange(clamp(Number(event.target.value)))}
          aria-label="Tempo"
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-panel-border accent-accent [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-panel-foreground [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_var(--accent)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-125"
          style={{
            background: `linear-gradient(90deg, var(--accent) ${sliderPercent}%, var(--panel-border) ${sliderPercent}%)`,
          }}
        />
        <BpmButton
          label="Subir tempo"
          onClick={(step) => onBpmChange(clamp(bpm + step))}
        >
          <PlusIcon />
        </BpmButton>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={tap}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-panel-border bg-panel-2 text-sm font-medium transition-[transform,background-color] duration-150 hover:bg-panel-border active:scale-95"
        >
          <TapIcon size={18} />
          Tap
        </button>
        <span className="relative">
          <span
            ref={ringRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full bg-accent opacity-0"
          />
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Parar metrónomo" : "Empezar metrónomo"}
            aria-pressed={playing}
            className="relative grid size-20 place-items-center rounded-full bg-accent text-accent-foreground shadow-[inset_0_2px_0_rgb(255_255_255/0.35),0_16px_40px_-12px_var(--accent)] transition-transform duration-300 ease-spring hover:scale-105 active:scale-90"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={playing ? "stop" : "play"}
                initial={{ scale: 0.4, opacity: 0, rotate: -45 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.4, opacity: 0, rotate: 45 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
              >
                {playing ? <StopIcon size={30} /> : <PlayIcon size={30} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </span>
        <button
          type="button"
          onClick={() => setSubAudible((value) => !value)}
          aria-pressed={subAudible}
          className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-[transform,background-color,border-color] duration-150 active:scale-95 ${
            subAudible
              ? "border-accent/50 bg-accent/10 text-panel-foreground"
              : "border-panel-border bg-panel-2 text-panel-muted"
          }`}
        >
          <VolumeIcon size={18} />
          Subdiv.
        </button>
      </div>

      <fieldset className="mt-4">
        <legend className="sr-only">Qué suena</legend>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="label-mono text-panel-muted">
            Suena
          </span>
          <div className="grid flex-1 grid-cols-3 gap-1 rounded-2xl border border-panel-border bg-panel-2 p-1">
            {SOUND_MODES.map(({ value, label }) => {
              const disabled = value !== "click" && !pattern;
              const checked = (pattern ? mode : "click") === value;
              return (
                <label
                  key={value}
                  className={`relative grid h-10 place-items-center rounded-xl text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-accent ${
                    disabled
                      ? "cursor-not-allowed text-panel-muted/50"
                      : checked
                        ? "cursor-pointer bg-panel-border text-panel-foreground"
                        : "cursor-pointer text-panel-muted hover:text-panel-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="practice-sound"
                    value={value}
                    checked={checked}
                    disabled={disabled}
                    onChange={() => chooseMode(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </div>
        {!pattern ? (
          <p className="mt-2 text-xs text-panel-muted">
            {exerciseName
              ? "Este ejercicio no tiene patrón: suena el clic."
              : "Elige un ejercicio con patrón para oír la caja."}
          </p>
        ) : null}
      </fieldset>

      {pattern && steps ? (
        <div className="mt-5">
          <PatternGrid
            pattern={pattern}
            steps={steps}
            notesPerBeat={notesPerBeat}
            active={step}
          />
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-panel-border bg-panel-2/60 p-4">
        {record ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="label-mono flex items-center gap-1.5 text-panel-muted">
                <TrophyIcon size={14} /> Récord {tierLabel(record.tier)}
              </p>
              <p className="mt-0.5 font-display text-2xl tabular-nums">
                {record.bpm}{" "}
                <span className="text-sm text-panel-muted">BPM</span>
              </p>
            </div>
            {aboveRecord ? (
              <motion.p
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
              >
                <span className="size-2 animate-blink rounded-full bg-accent-foreground" />
                Intento de récord
              </motion.p>
            ) : challenge ? (
              <button
                type="button"
                onClick={() => onBpmChange(challenge)}
                className="rounded-full border border-accent/60 px-3 py-1.5 text-sm font-semibold text-accent transition-[transform,background-color] hover:bg-accent/10 active:scale-95"
              >
                Reto: {challenge} BPM
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-panel-muted">
            {exerciseName
              ? `Aún no tienes récord en ${exerciseName} con esta mano: lo que toques hoy será tu punto de partida.`
              : "Elige un ejercicio para ver tu récord y retarte."}
          </p>
        )}
      </div>

      <AnimatePresence initial={false}>
        {series.length ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between pt-4">
              <p className="label-mono text-panel-muted">
                Series de esta sesión
              </p>
              <button
                type="button"
                onClick={() => onSeries([])}
                className="flex items-center gap-1 text-xs text-panel-muted transition-colors hover:text-panel-foreground"
              >
                <ResetIcon size={14} /> Reiniciar
              </button>
            </div>
            <ul className="mt-2 flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {series.map((serie, i) => (
                  <motion.li
                    // biome-ignore lint/suspicious/noArrayIndexKey: las series solo se añaden al final.
                    key={i}
                    layout
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`rounded-full border px-3 py-1 font-mono text-xs tabular-nums ${
                      serie.bpm === bpm
                        ? "border-accent/60 bg-accent/10 text-panel-foreground"
                        : "border-panel-border text-panel-muted"
                    }`}
                  >
                    {formatClock(serie.seconds)} · {serie.bpm}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <p className="mt-4 hidden text-xs text-panel-muted lg:block">
        <kbd className="rounded border border-panel-border px-1 font-mono">
          Espacio
        </kbd>{" "}
        empieza o para ·{" "}
        <kbd className="rounded border border-panel-border px-1 font-mono">
          ↑ ↓
        </kbd>{" "}
        cambian el tempo (Mayús ×5)
      </p>
    </section>
  );
}

function BpmButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => onClick(event.shiftKey ? 5 : 1)}
      className="grid size-11 shrink-0 place-items-center rounded-full border border-panel-border bg-panel-2 transition-[transform,background-color] duration-150 hover:bg-panel-border active:scale-90"
    >
      {children}
    </button>
  );
}
