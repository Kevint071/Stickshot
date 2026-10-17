"use client";

import { motion } from "motion/react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { SoundKit } from "@/db/schema";
import { saveSoundSettingsAction } from "@/lib/actions/sound";
import { Metronome } from "@/lib/metronome";
import type { Dynamic } from "@/lib/pattern";
import {
  GHOST_VOLUME_MAX,
  GHOST_VOLUME_MIN,
  SOUND_KITS,
  type SoundSettings,
} from "@/lib/sound-settings";
import { CheckIcon } from "./icons";
import { DynamicSwatch } from "./pattern-player";

const KITS: Record<SoundKit, { name: string; description: string }> = {
  acoustic: {
    name: "Caja acústica",
    description: "Madera, parche y bordonero suelto, con algo de sala.",
  },
  pad: {
    name: "Pad de práctica",
    description: "Goma seca, sin bordonero ni eco. Como tu pad.",
  },
  marching: {
    name: "Caja de marcha",
    description: "Afinación alta y tensa, golpe seco de drumline.",
  },
  deep: {
    name: "Caja grave",
    description: "Más cuerpo y menos agudos: cansa menos en sesiones largas.",
  },
};

const LISTEN_ORDER: Dynamic[] = ["accent", "normal", "ghost"];

const DYNAMIC_LABELS: Record<Dynamic, string> = {
  accent: "acento",
  normal: "golpe normal",
  ghost: "ghost note",
};

/**
 * Ajustes → Sonido: kit de caja y volumen de la ghost. Cada cambio se oye al
 * momento y se guarda con la cuenta (actualización optimista).
 */
export function SoundSettingsPanel({ initial }: { initial: SoundSettings }) {
  const name = useId();
  const [engine] = useState(() => new Metronome());
  const [kit, setKit] = useState(initial.soundKit);
  const [ghost, setGhost] = useState(initial.ghostVolume);
  const [error, setError] = useState<string>();
  const [, startSave] = useTransition();
  // Último volumen guardado, para no repetir el guardado si no cambió.
  const lastSaved = useRef(initial.ghostVolume);
  useEffect(() => () => engine.close(), [engine]);

  function listen(soundKit: SoundKit, dynamic: Dynamic, ghostVolume = ghost) {
    engine.kit = soundKit;
    engine.ghostVolume = ghostVolume;
    void engine.preview({ hand: "R", dynamic });
  }

  function save(patch: Partial<SoundSettings>, revert: () => void) {
    setError(undefined);
    startSave(async () => {
      const result = await saveSoundSettingsAction(patch);
      if (!result.ok) {
        revert();
        setError(result.error);
      }
    });
  }

  function chooseKit(next: SoundKit) {
    const previous = kit;
    setKit(next);
    listen(next, "accent");
    save({ soundKit: next }, () => setKit(previous));
  }

  /** Al soltar el deslizador: suena una ghost y se guarda. */
  function commitGhost() {
    listen(kit, "ghost");
    if (ghost === lastSaved.current) return;
    const previous = lastSaved.current;
    lastSaved.current = ghost;
    save({ ghostVolume: ghost }, () => {
      lastSaved.current = previous;
      setGhost(previous);
    });
  }

  const percent =
    ((ghost - GHOST_VOLUME_MIN) / (GHOST_VOLUME_MAX - GHOST_VOLUME_MIN)) * 100;

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="label-mono mb-2 text-muted">Kit de caja</legend>
        <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          {LISTEN_ORDER.map((dynamic) => (
            <span key={dynamic} className="inline-flex items-center gap-1.5">
              <DynamicSwatch dynamic={dynamic} />
              {DYNAMIC_LABELS[dynamic][0].toUpperCase()}
              {DYNAMIC_LABELS[dynamic].slice(1)}
            </span>
          ))}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          {SOUND_KITS.map((value) => {
            const checked = kit === value;
            return (
              <div
                key={value}
                className={`relative flex flex-col overflow-hidden rounded-2xl border bg-panel p-1.5 text-panel-foreground transition-[border-color,box-shadow] duration-200 ${
                  checked
                    ? "border-accent shadow-[0_0_0_1px_var(--accent),0_16px_40px_-24px_var(--accent)]"
                    : "border-panel-border hover:border-panel-muted"
                }`}
              >
                <div
                  aria-hidden="true"
                  className="bg-ticks pointer-events-none absolute inset-x-0 top-0 h-1.5 text-panel-border"
                />
                <label className="block flex-1 cursor-pointer rounded-xl px-2 pt-3 pb-2 has-focus-visible:ring-2 has-focus-visible:ring-accent sm:px-3">
                  <input
                    type="radio"
                    name={name}
                    value={value}
                    checked={checked}
                    onChange={() => chooseKit(value)}
                    className="sr-only"
                  />
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-display text-base leading-tight sm:text-lg">
                      {KITS[value].name}
                    </span>
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${
                        checked
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-panel-border"
                      }`}
                    >
                      {checked ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 700,
                            damping: 22,
                          }}
                        >
                          <CheckIcon size={12} strokeWidth={3} />
                        </motion.span>
                      ) : null}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-panel-muted text-pretty">
                    {KITS[value].description}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1 px-0.5 pb-0.5 sm:px-1.5 sm:pb-1.5">
                  {LISTEN_ORDER.map((dynamic) => (
                    <button
                      key={dynamic}
                      type="button"
                      onClick={() => listen(value, dynamic)}
                      aria-label={`Escuchar ${DYNAMIC_LABELS[dynamic]} de ${KITS[value].name}`}
                      className="grid h-11 place-items-center rounded-xl border border-panel-border bg-panel-2 transition-[transform,border-color] duration-150 hover:border-panel-muted active:scale-90"
                    >
                      <DynamicSwatch dynamic={dynamic} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`${name}-ghost`} className="label-mono text-muted">
            Volumen de la ghost note
          </label>
          <span className="font-display text-2xl tabular-nums">{ghost} %</span>
        </div>
        <input
          id={`${name}-ghost`}
          type="range"
          min={GHOST_VOLUME_MIN}
          max={GHOST_VOLUME_MAX}
          value={ghost}
          onChange={(event) => setGhost(Number(event.target.value))}
          onPointerUp={commitGhost}
          onKeyUp={commitGhost}
          aria-valuetext={`${ghost} % del acento`}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full accent-accent [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_var(--accent)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-125"
          style={{
            background: `linear-gradient(90deg, var(--accent) ${percent}%, var(--border-strong) ${percent}%)`,
          }}
        />
        <p className="mt-2 text-sm text-muted text-pretty">
          Respecto al acento (100 %). En la batería real una ghost suele estar
          entre el 20 % y el 40 %: al soltar, suena una para que la compares.
        </p>
      </div>

      {error ? (
        <p role="alert" className="animate-rise text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
