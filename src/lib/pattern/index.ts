import { z } from "zod";
import type { Subdivision } from "@/db/schema";
import { NOTES_PER_BEAT } from "@/lib/records";

/*
 * Patrón de un ejercicio: golpes de caja que se repiten en bucle. Un paso dura
 * una nota de la subdivisión en uso; el patrón no fija el tempo. Se escribe
 * siempre empezando con la derecha: `mirror` da la versión para la izquierda.
 *
 * Lógica pura y sin dependencias de servidor: la usan también los componentes
 * de cliente (cuadrícula, reproductor, editor).
 */

export const PATTERN_HANDS = ["R", "L"] as const;
export const DYNAMICS = ["ghost", "normal", "accent"] as const;
export const ORNAMENTS = ["flam", "drag", "buzz"] as const;
export const MAX_STEPS = 64;

export type PatternHand = (typeof PATTERN_HANDS)[number];
export type Dynamic = (typeof DYNAMICS)[number];
export type Ornament = (typeof ORNAMENTS)[number];
export type Stroke = {
  hand: PatternHand;
  dynamic: Dynamic;
  ornament?: Ornament;
};
/** null = silencio. */
export type Step = Stroke | null;
export type Pattern = { steps: Step[]; subdivision: Subdivision };

const SUBDIVISIONS = Object.keys(NOTES_PER_BEAT) as [
  Subdivision,
  ...Subdivision[],
];

const strokeSchema = z.object({
  hand: z.enum(PATTERN_HANDS),
  dynamic: z.enum(DYNAMICS),
  ornament: z.enum(ORNAMENTS).optional(),
});

export const patternSchema = z.object({
  steps: z
    .array(strokeSchema.nullable())
    .min(1, { error: "El patrón necesita al menos un golpe" })
    .max(MAX_STEPS, { error: `Como máximo ${MAX_STEPS} pasos` })
    .refine((steps) => steps.some((step) => step !== null), {
      error: "El patrón necesita al menos un golpe",
    }),
  subdivision: z.enum(SUBDIVISIONS),
});

/** Patrón leído de la base de datos: si no cumple el esquema, se trata como "sin patrón". */
export function parsePattern(value: unknown): Pattern | null {
  const parsed = patternSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

const OTHER: Record<PatternHand, PatternHand> = { R: "L", L: "R" };

export function otherHand(hand: PatternHand) {
  return OTHER[hand];
}

/** El mismo patrón empezando con la otra mano. */
export function mirror(pattern: Pattern): Pattern {
  return {
    ...pattern,
    steps: pattern.steps.map((step) =>
      step ? { ...step, hand: OTHER[step.hand] } : null,
    ),
  };
}

/** Patrón según la mano inicial: los patrones se escriben empezando con la derecha. */
export function forLeadHand(pattern: Pattern, lead: PatternHand): Pattern {
  return lead === "R" ? pattern : mirror(pattern);
}

const HAND_LETTER: Record<PatternHand, string> = { R: "D", L: "I" };

/**
 * Texto del golpe: D/I, minúscula si es ghost, ">" si es acento, "f" (flam) o
 * "dr" (drag) delante y "z" (buzz) detrás. Un silencio es "-".
 */
export function describeStep(step: Step) {
  if (!step) return "-";
  const letter = HAND_LETTER[step.hand];
  const hand = step.dynamic === "ghost" ? letter.toLowerCase() : letter;
  const prefix =
    step.ornament === "flam" ? "f" : step.ornament === "drag" ? "dr" : "";
  const suffix = `${step.ornament === "buzz" ? "z" : ""}${step.dynamic === "accent" ? ">" : ""}`;
  return `${prefix}${hand}${suffix}`;
}

/** Patrón como texto, agrupado por pulsos de su subdivisión natural. */
export function describe(pattern: Pattern, maxSteps = MAX_STEPS) {
  const perBeat = NOTES_PER_BEAT[pattern.subdivision];
  const shown = pattern.steps.slice(0, maxSteps);
  const groups: string[] = [];
  for (let i = 0; i < shown.length; i += perBeat) {
    groups.push(
      shown
        .slice(i, i + perBeat)
        .map(describeStep)
        .join(" "),
    );
  }
  const text = groups.join("  ");
  return shown.length < pattern.steps.length ? `${text} …` : text;
}

/** Paso que toca en el tick n del metrónomo (cada nota de la subdivisión es un paso). */
export function stepAt(tick: number, length: number) {
  return ((tick % length) + length) % length;
}

const SUB_COUNTS: Record<number, readonly string[]> = {
  2: ["", "&"],
  3: ["", "&", "a"],
  4: ["", "e", "&", "a"],
};

/**
 * Conteo bajo el paso i: número del pulso en la primera nota (1-4, compás de
 * 4/4) y la sílaba de la subdivisión en el resto; "·" si no hay sílaba usual.
 */
export function countLabel(index: number, notesPerBeat: number) {
  const sub = index % notesPerBeat;
  if (sub === 0) return String((Math.floor(index / notesPerBeat) % 4) + 1);
  return SUB_COUNTS[notesPerBeat]?.[sub] ?? "·";
}
