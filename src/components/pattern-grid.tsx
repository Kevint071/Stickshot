import type { ReactNode } from "react";
import {
  countLabel,
  type Dynamic,
  describe,
  otherHand,
  type Pattern,
  type PatternHand,
  type Step,
} from "@/lib/pattern";

const LANES: { hand: PatternHand; label: string; tone: string }[] = [
  { hand: "R", label: "D", tone: "text-right-hand bg-right-hand/15" },
  { hand: "L", label: "I", tone: "text-left-hand bg-left-hand/15" },
];

const HAND_COLOR: Record<PatternHand, string> = {
  R: "[--c:var(--right-hand)]",
  L: "[--c:var(--left-hand)]",
};

/** Pasos por línea: múltiplos del pulso, para no partir un tiempo entre dos líneas. */
function perLine(max: number, notesPerBeat: number) {
  return Math.max(notesPerBeat, max - (max % notesPerBeat));
}

function chunk<T>(items: T[], size: number) {
  const lines: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    lines.push(items.slice(i, i + size));
  return lines;
}

/**
 * Cuadrícula de dos carriles (D arriba, I abajo) sobre panel oscuro. El tamaño
 * del bloque es la fuerza: acento lleno con ">", normal mediano, ghost anillo.
 * Las notas de gracia de flam y drag se marcan en el carril de la otra mano.
 *
 * Se pinta dos veces (16 y 8 pasos por línea) y una container query muestra la
 * que cabe: sin medir en JS ni saltos de maquetación.
 */
export function PatternGrid({
  pattern,
  steps = pattern.steps,
  notesPerBeat,
  active,
  selected,
  onSelect,
}: {
  pattern: Pattern;
  /** Pasos a pintar (p. ej. en espejo); por defecto los del patrón. */
  steps?: Step[];
  notesPerBeat: number;
  /** Paso que está sonando. */
  active?: number;
  /** Paso elegido en el editor. */
  selected?: number;
  /** Con esto, cada columna es un botón (editor). */
  onSelect?: (index: number) => void;
}) {
  const indexed = steps.map((step, index) => ({ step, index }));
  const label = describe({ ...pattern, steps });
  const layouts = [
    { size: perLine(16, notesPerBeat), className: "hidden @lg:block" },
    { size: perLine(8, notesPerBeat), className: "@lg:hidden" },
  ];
  const lines = layouts.map(({ size, className }) => (
    <div key={size + className} className={`space-y-3 ${className}`}>
      {chunk(indexed, size).map((line) => (
        <div key={line[0].index} className="flex gap-1">
          <LaneLabels />
          {line.map(({ step, index }) => (
            <Column
              key={index}
              step={step}
              index={index}
              notesPerBeat={notesPerBeat}
              active={active === index}
              selected={selected === index}
              onSelect={onSelect}
            />
          ))}
          {/* Huecos al final para que todas las líneas tengan la misma rejilla. */}
          {Array.from({ length: size - line.length }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: relleno fijo.
              key={i}
              aria-hidden="true"
              className="max-w-14 min-w-0 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  ));
  // En el editor cada columna es un botón; si no, la cuadrícula es una imagen
  // que el lector de pantalla anuncia como texto.
  return onSelect ? (
    <fieldset className="@container min-w-0">
      <legend className="sr-only">Pasos del patrón: {label}</legend>
      {lines}
    </fieldset>
  ) : (
    <div className="@container" role="img" aria-label={`Patrón: ${label}`}>
      {lines}
    </div>
  );
}

function LaneLabels() {
  return (
    <div aria-hidden="true" className="flex w-7 shrink-0 flex-col gap-1">
      {LANES.map(({ hand, label, tone }) => (
        <span
          key={hand}
          className={`grid aspect-[1/1.15] place-items-center rounded-lg font-display text-xs ${tone}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function Column({
  step,
  index,
  notesPerBeat,
  active,
  selected,
  onSelect,
}: {
  step: Step;
  index: number;
  notesPerBeat: number;
  active: boolean;
  selected: boolean;
  onSelect?: (index: number) => void;
}) {
  const beatStart = index % notesPerBeat === 0;
  const count = countLabel(index, notesPerBeat);
  const cells = LANES.map(({ hand }) => (
    <Cell key={hand} hand={hand} step={step} beatStart={beatStart} />
  ));
  const frame = active
    ? "ring-2 ring-accent shadow-[0_0_18px_-4px_var(--accent)]"
    : selected
      ? "ring-2 ring-panel-foreground"
      : "";
  const body: ReactNode = (
    <>
      <span
        className={`flex flex-col gap-1 rounded-xl p-0.5 ${frame} ${active ? "**:data-note:scale-110 **:data-note:brightness-125" : ""}`}
      >
        {cells}
      </span>
      <span
        className={`mt-1 block text-center font-mono text-[11px] ${
          active
            ? "text-accent"
            : beatStart
              ? "text-panel-foreground"
              : "text-panel-muted"
        }`}
      >
        {count}
      </span>
    </>
  );
  const layout = `max-w-14 min-w-0 flex-1 ${beatStart && index > 0 ? "ml-1" : ""}`;
  if (!onSelect) return <div className={layout}>{body}</div>;
  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      aria-pressed={selected}
      aria-label={`Paso ${index + 1}`}
      className={`${layout} cursor-pointer rounded-xl text-left transition-transform active:scale-95`}
    >
      {body}
    </button>
  );
}

function Cell({
  hand,
  step,
  beatStart,
}: {
  hand: PatternHand;
  step: Step;
  beatStart: boolean;
}) {
  const own = step?.hand === hand;
  const grace =
    step && hand === otherHand(step.hand) && step.ornament !== "buzz"
      ? step.ornament
      : undefined;
  return (
    <span
      className={`relative grid aspect-[1/1.15] place-items-center rounded-lg ${
        beatStart ? "bg-[#24211d]" : "bg-panel-2"
      } ${HAND_COLOR[hand]}`}
    >
      {own && step ? (
        <Note dynamic={step.dynamic} buzz={step.ornament === "buzz"} />
      ) : null}
      {grace ? <Grace count={grace === "drag" ? 2 : 1} /> : null}
      {step === null && hand === "R" ? (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 h-0.5 w-2 translate-y-1/2 rounded-full bg-panel-muted/50"
        />
      ) : null}
    </span>
  );
}

function Note({ dynamic, buzz }: { dynamic: Dynamic; buzz: boolean }) {
  const shape =
    dynamic === "accent"
      ? "size-[84%] rounded-md bg-(--c) shadow-[0_6px_18px_-8px_var(--c)]"
      : dynamic === "normal"
        ? "h-[52%] w-[58%] rounded-[5px] bg-(--c)/75"
        : "h-[34%] w-[40%] rounded-full border-2 border-(--c)/70";
  return (
    <span
      data-note=""
      className={`relative grid place-items-center transition-[transform,filter] duration-75 ${shape}`}
    >
      {dynamic === "accent" ? (
        <span className="font-display text-[13px] leading-none text-white">
          &gt;
        </span>
      ) : null}
      {buzz ? (
        <span className="absolute -top-2.5 font-mono text-[11px] leading-none font-semibold text-panel-foreground">
          z
        </span>
      ) : null}
    </span>
  );
}

/** Notas de gracia: una (flam) o dos (drag) notitas en la esquina. */
function Grace({ count }: { count: number }) {
  return (
    <span aria-hidden="true" className="absolute top-1 right-1 flex gap-0.5">
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: una o dos notitas fijas.
        <span key={i} className="size-1.5 rounded-full bg-(--c)/80" />
      ))}
    </span>
  );
}
