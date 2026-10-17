"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import type { SavedRecord } from "@/lib/actions/logs";
import { HAND_LABELS, tierLabel } from "@/lib/labels";
import { CheckIcon, CloseIcon, TrophyIcon } from "./icons";

export type SaveFeedback = {
  id: number;
  title: string;
  records: SavedRecord[];
};

const PARTICLES = 28;
const COLORS = [
  "var(--accent)",
  "var(--right-hand)",
  "var(--left-hand)",
  "#facc15",
];

/** Ráfaga determinista: el ángulo y la distancia salen del índice, no de Math.random. */
function particle(i: number) {
  const angle = (i / PARTICLES) * Math.PI * 2 + (i % 3) * 0.2;
  const distance = 90 + ((i * 37) % 70);
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance - 20,
    rotate: (i * 47) % 360,
    color: COLORS[i % COLORS.length],
    round: i % 2 === 0,
  };
}

/**
 * Aviso tras guardar. Si el registro batió algún récord, se celebra con una
 * ráfaga y el detalle del tramo más largo; si no, un aviso discreto.
 */
export function RecordCelebration({
  feedback,
  onClose,
}: {
  feedback: SaveFeedback | undefined;
  onClose: () => void;
}) {
  const record = feedback?.records.at(-1);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(onClose, record ? 6500 : 3200);
    return () => clearTimeout(timer);
  }, [feedback, record, onClose]);

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4 lg:bottom-10 lg:pl-64"
    >
      <AnimatePresence>
        {feedback ? (
          <motion.div
            key={feedback.id}
            initial={{ y: 60, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className={`pointer-events-auto relative w-full max-w-sm rounded-[24px] border p-5 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.55)] ${
              record
                ? "border-panel-border bg-panel text-panel-foreground"
                : "border-border bg-surface"
            }`}
          >
            {record ? (
              <div aria-hidden="true" className="absolute top-8 left-10">
                {Array.from({ length: PARTICLES }, (_, i) => {
                  const p = particle(i);
                  return (
                    <motion.span
                      // biome-ignore lint/suspicious/noArrayIndexKey: partículas fijas.
                      key={i}
                      initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                      animate={{
                        x: p.x,
                        y: [0, p.y, p.y + 60],
                        scale: [0, 1, 0.6],
                        opacity: [1, 1, 0],
                        rotate: p.rotate,
                      }}
                      transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                      className={`absolute block size-2 ${p.round ? "rounded-full" : "rounded-[2px]"}`}
                      style={{ background: p.color }}
                    />
                  );
                })}
              </div>
            ) : null}

            <div className="flex items-start gap-4">
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 12,
                  delay: 0.08,
                }}
                className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                  record
                    ? "bg-accent text-accent-foreground shadow-[0_0_30px_var(--accent)]"
                    : "bg-success/15 text-success"
                }`}
              >
                {record ? <TrophyIcon size={22} /> : <CheckIcon size={22} />}
              </motion.span>
              <div className="min-w-0 flex-1">
                <p
                  className={record ? "font-display text-xl" : "font-semibold"}
                >
                  {record ? "¡Récord nuevo!" : "Guardado"}
                </p>
                <p
                  className={`mt-0.5 text-sm ${record ? "text-panel-muted" : "text-muted"}`}
                >
                  {feedback.title}
                </p>
                {record ? (
                  <p className="mt-3 flex items-baseline gap-2">
                    <span className="font-display text-3xl tabular-nums">
                      {record.value}
                    </span>
                    <span className="text-sm text-panel-muted">
                      golpes/min · antes {record.previous}
                    </span>
                  </p>
                ) : null}
                {record ? (
                  <p className="label-mono mt-2 text-accent">
                    {HAND_LABELS[record.hand]} · {tierLabel(record.tier)}
                    {feedback.records.length > 1
                      ? ` · ${feedback.records.length} tramos`
                      : ""}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar aviso"
                className="-m-1 rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100"
              >
                <CloseIcon size={18} />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
