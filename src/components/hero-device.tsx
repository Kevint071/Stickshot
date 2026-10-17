"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Metronome } from "@/lib/metronome";
import { PlayIcon, StopIcon, TrophyIcon } from "./icons";

const START_BPM = 120;
const RECORD_BPM = 132;
const STEP = 4;
const BEATS_PER_STEP = 8;
const MAX_SWING_DEG = 24;

/**
 * Demo de la portada: un metrónomo que sube el tempo de 4 en 4 hasta batir un
 * récord y vuelve a empezar. En silencio va con su propio reloj; con sonido,
 * el péndulo sigue los clics reales del motor de audio.
 */
export function HeroDevice() {
  const [bpm, setBpm] = useState(START_BPM);
  const [sound, setSound] = useState(false);
  const [engine] = useState(() => new Metronome());
  const armRef = useRef<SVGGElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const bpmRef = useRef(START_BPM);

  useEffect(() => {
    bpmRef.current = bpm;
    engine.bpm = bpm;
  }, [bpm, engine]);

  useEffect(() => () => engine.close(), [engine]);

  useEffect(() => {
    engine.notesPerBeat = 1;
    let frame = 0;
    let lastBeat = -1;
    let beatsAtTempo = 0;
    // Reloj propio para el modo silencioso: pulsos acumulados con el tempo vigente.
    let silentBeat = 0;
    let silentStart = performance.now();
    const loop = (now: number) => {
      let beat: number;
      let progress: number;
      const tick = engine.playing ? engine.current() : undefined;
      if (tick) {
        beat = tick.beat;
        progress = Math.min(1, (engine.now() - tick.time) / (60 / engine.bpm));
      } else {
        const beatMs = 60000 / bpmRef.current;
        while (now - silentStart >= beatMs) {
          silentStart += beatMs;
          silentBeat += 1;
        }
        beat = silentBeat;
        progress = (now - silentStart) / beatMs;
      }
      const swing = MAX_SWING_DEG * Math.cos(Math.PI * (beat + progress));
      armRef.current?.setAttribute("transform", `rotate(${swing} 100 172)`);
      if (beat !== lastBeat) {
        lastBeat = beat;
        const dots = dotsRef.current?.children;
        if (dots) {
          for (let i = 0; i < dots.length; i += 1) {
            (dots[i] as HTMLElement).dataset.on = String(i === beat % 4);
          }
        }
        beatsAtTempo += 1;
        if (beatsAtTempo >= BEATS_PER_STEP) {
          beatsAtTempo = 0;
          setBpm((current) =>
            current >= RECORD_BPM ? START_BPM : current + STEP,
          );
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engine]);

  async function toggleSound() {
    if (engine.playing) {
      engine.stop();
      setSound(false);
    } else {
      await engine.start();
      setSound(true);
    }
  }

  const broke = bpm === RECORD_BPM;
  const weightY = 52 + ((bpm - 60) / 180) * 80;

  return (
    <div className="relative">
      {/* Halo del LED: marca el foco de la composición, no decora el fondo. */}
      <div
        aria-hidden="true"
        className="absolute inset-8 -z-10 rounded-full bg-accent/30 blur-3xl"
      />
      <div className="relative animate-float overflow-hidden rounded-4xl border border-panel-border bg-panel p-6 text-panel-foreground shadow-[0_40px_100px_-40px_rgb(0_0_0/0.85),inset_0_1px_0_rgb(255_255_255/0.07)] sm:p-7">
        <div
          aria-hidden="true"
          className="bg-ticks absolute inset-x-0 top-0 h-2 text-panel-border"
        />
        <div className="flex items-center justify-between">
          <p className="label-mono flex items-center gap-2 text-panel-muted">
            <span className="size-2 animate-blink rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
            Single Paradiddle · 1 min
          </p>
          <AnimatePresence>
            {broke ? (
              <motion.span
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 16 }}
                className="label-mono flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 font-semibold text-accent-foreground"
              >
                <TrophyIcon size={12} /> Récord
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] items-center gap-4">
          <svg viewBox="0 0 200 200" className="w-full" aria-hidden="true">
            <path
              d="M76 18h48l40 168H36z"
              fill="var(--panel-2)"
              stroke="var(--panel-border)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {Array.from({ length: 9 }, (_, i) => (
              <line
                // biome-ignore lint/suspicious/noArrayIndexKey: marcas fijas.
                key={i}
                x1={92}
                x2={108}
                y1={40 + i * 13}
                y2={40 + i * 13}
                stroke="var(--panel-border)"
                strokeWidth={i % 2 ? 1 : 2}
              />
            ))}
            <g ref={armRef}>
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
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              />
            </g>
            <circle cx="100" cy="172" r="6" fill="var(--panel-foreground)" />
          </svg>
          <div className="text-right">
            <div className="overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.p
                  key={bpm}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className={`font-display text-7xl leading-none tabular-nums sm:text-8xl ${broke ? "text-accent" : ""}`}
                >
                  {bpm}
                </motion.p>
              </AnimatePresence>
            </div>
            <p className="label-mono mt-1 text-panel-muted">BPM</p>
            <div ref={dotsRef} className="mt-4 flex justify-end gap-2">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  data-on="false"
                  className={`size-3 rounded-full bg-panel-border transition-[background-color,transform] duration-75 data-[on=true]:scale-125 ${
                    i === 0
                      ? "data-[on=true]:bg-accent data-[on=true]:shadow-[0_0_14px_var(--accent)]"
                      : "data-[on=true]:bg-panel-foreground"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-panel-border pt-5">
          <div>
            <p className="label-mono text-panel-muted">Récord anterior</p>
            <p className="font-display text-2xl tabular-nums">
              {RECORD_BPM - STEP}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            className="flex items-center gap-2 rounded-full border border-panel-border bg-panel-2 py-2 pr-4 pl-2 text-sm font-medium transition-[transform,background-color] hover:bg-panel-border active:scale-95"
          >
            <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground">
              {sound ? <StopIcon size={14} /> : <PlayIcon size={14} />}
            </span>
            {sound ? "Silenciar" : "Escúchalo"}
          </button>
        </div>
      </div>
    </div>
  );
}
