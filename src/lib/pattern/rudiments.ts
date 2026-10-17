import type { Subdivision } from "@/db/schema";
import { mirror, type Pattern, type Step } from ".";

/**
 * Notación compacta para escribir patrones a mano: un golpe por palabra.
 * `R`/`L` mano (minúscula = ghost), `>` acento, `f` delante = flam, `dr`
 * delante = drag, `z` detrás = buzz y `-` = silencio. Ej.: "fR> L R  fL> R L".
 */
export function notation(subdivision: Subdivision, text: string): Pattern {
  const steps = text
    .trim()
    .split(/\s+/)
    .map((token): Step => {
      if (token === "-") return null;
      const match = /^(f|dr)?([RLrl])(z)?(>)?$/.exec(token);
      if (!match) throw new Error(`Golpe no válido: "${token}"`);
      const [, prefix, hand, buzz, accent] = match;
      const ghost = hand === hand.toLowerCase();
      const ornament =
        prefix === "f"
          ? "flam"
          : prefix === "dr"
            ? "drag"
            : buzz
              ? "buzz"
              : undefined;
      return {
        hand: hand.toUpperCase() as "R" | "L",
        dynamic: accent ? "accent" : ghost ? "ghost" : "normal",
        ...(ornament ? { ornament } : {}),
      };
    });
  return { subdivision, steps };
}

/** Patrón que se repite empezando por cada mano: el escrito y su espejo. */
function bothHands(pattern: Pattern): Pattern {
  return { ...pattern, steps: [...pattern.steps, ...mirror(pattern).steps] };
}

/**
 * Redoble de N golpes en fusas: diddles alternos y el golpe final acentuado,
 * con silencios hasta completar el pulso. Se repite empezando por cada mano.
 */
function roll(strokes: number): Pattern {
  const diddles = strokes - 1;
  const hits = Array.from({ length: diddles }, (_, i) =>
    Math.floor(i / 2) % 2 === 0 ? "R" : "L",
  );
  const last = Math.floor(diddles / 2) % 2 === 0 ? "R>" : "L>";
  const body = [...hits, last];
  const rests = (8 - (body.length % 8)) % 8;
  return bothHands(
    notation("thirty_second", [...body, ...Array(rests).fill("-")].join(" ")),
  );
}

/**
 * Los 40 rudimentos internacionales de la PAS, empezando con la derecha. Un
 * ciclo completo: los que alternan de mano incluyen la vuelta con la izquierda.
 * Las claves coinciden con los nombres sembrados en drizzle/0001.
 */
export const RUDIMENT_PATTERNS: Record<string, Pattern> = {
  // I. Redobles: golpes simples
  "Single Stroke Roll": notation("sixteenth", "R L R L R L R L"),
  "Single Stroke Four": notation("triplet", "R L R  L> - -  L R L  R> - -"),
  "Single Stroke Seven": notation(
    "sextuplet",
    "R L R L R L  R> - - - - -  L R L R L R  L> - - - - -",
  ),
  // Redobles: rebotes múltiples
  "Multiple Bounce Roll": notation("sixteenth", "Rz Lz Rz Lz Rz Lz Rz Lz"),
  "Triple Stroke Roll": notation("triplet", "R R R  L L L"),
  // Redobles: dobles abiertos
  "Double Stroke Open Roll": notation("sixteenth", "R R L L R R L L"),
  "Five Stroke Roll": roll(5),
  "Six Stroke Roll": notation("thirty_second", "R> - L L R R L> -"),
  "Seven Stroke Roll": roll(7),
  "Nine Stroke Roll": roll(9),
  "Ten Stroke Roll": notation(
    "thirty_second",
    "R R L L R R L L  R> - - - L> - - -",
  ),
  "Eleven Stroke Roll": roll(11),
  "Thirteen Stroke Roll": roll(13),
  "Fifteen Stroke Roll": roll(15),
  "Seventeen Stroke Roll": roll(17),

  // II. Paradiddles
  "Single Paradiddle": notation("sixteenth", "R> L R R  L> R L L"),
  "Double Paradiddle": notation("triplet", "R> L R  L R R  L> R L  R L L"),
  "Triple Paradiddle": notation(
    "sixteenth",
    "R> L R L  R L R R  L> R L R  L R L L",
  ),
  "Paradiddle-Diddle": notation("triplet", "R> L R  R L L"),

  // III. Flams
  Flam: notation("eighth", "fR fL"),
  "Flam Accent": notation("triplet", "fR> L R  fL> R L"),
  "Flam Tap": notation("sixteenth", "fR R fL L"),
  Flamacue: notation("sixteenth", "fR L> R L  fR - - -  fL R> L R  fL - - -"),
  "Flam Paradiddle": notation("sixteenth", "fR L R R  fL R L L"),
  "Single Flammed Mill": notation("sixteenth", "fR R L R  fL L R L"),
  "Flam Paradiddle-Diddle": notation("triplet", "fR L R  R L L  fL R L  L R R"),
  Pataflafla: notation("sixteenth", "fR L R fL"),
  "Swiss Army Triplet": notation("triplet", "fR R L"),
  "Inverted Flam Tap": notation("sixteenth", "fR L fL R"),
  "Flam Drag": notation("triplet", "fR> drR L  fL> drL R"),

  // IV. Drags
  Drag: notation("eighth", "drR drL"),
  "Single Drag Tap": notation("eighth", "drR L>  drL R>"),
  "Double Drag Tap": notation("triplet", "drR drR L>  drL drL R>"),
  "Lesson 25": notation("sixteenth", "drR L R> -  drL R L> -"),
  "Single Dragadiddle": notation("sixteenth", "R> drR L L  L> drL R R"),
  "Drag Paradiddle #1": notation("sixteenth", "R> drR L R R  L> drL R L L"),
  "Drag Paradiddle #2": notation(
    "sixteenth",
    "R> drR R> drR L R R  L> drL L> drL R L L",
  ),
  "Single Ratamacue": notation("triplet", "drR L R  L> - -  drL R L  R> - -"),
  "Double Ratamacue": notation(
    "triplet",
    "drR drR L  R L> -  drL drL R  L R> -",
  ),
  "Triple Ratamacue": notation(
    "triplet",
    "drR drR drR  L R L>  drL drL drL  R L R>",
  ),
};

/** UPDATE idempotente con los patrones de los rudimentos estándar. */
export function rudimentPatternsSql() {
  return Object.entries(RUDIMENT_PATTERNS)
    .map(([name, pattern]) => {
      const json = JSON.stringify(pattern).replaceAll("'", "''");
      const literal = name.replaceAll("'", "''");
      return `UPDATE "exercises" SET "pattern" = '${json}'::jsonb WHERE "user_id" IS NULL AND "name" = '${literal}';`;
    })
    .join("\n--> statement-breakpoint\n");
}
