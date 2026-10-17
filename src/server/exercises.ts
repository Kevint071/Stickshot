import { and, eq, isNull, max, or, sql } from "drizzle-orm";
import { z } from "zod";
import { exerciseLogs, exercises, practiceDays } from "@/db/schema";
import type { Db } from "@/db/types";
import { isUuid } from "@/lib/ids";
import { type Pattern, parsePattern, patternSchema } from "@/lib/pattern";

export type PickerExercise = {
  id: string;
  name: string;
  custom: boolean;
  lastPracticed: string | null;
  pattern: Pattern | null;
};

const collator = new Intl.Collator("es", { sensitivity: "base" });

/** Condición: rudimento estándar o ejercicio propio del usuario. */
export function visibleTo(userId: string) {
  return or(isNull(exercises.userId), eq(exercises.userId, userId));
}

/**
 * Ejercicios que el usuario puede registrar: los practicados primero (del más
 * reciente al más antiguo) y después el resto en orden alfabético.
 */
export async function listExercisesForPicker(
  db: Db,
  userId: string,
): Promise<PickerExercise[]> {
  const rows = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      ownerId: exercises.userId,
      pattern: exercises.pattern,
      lastDate: max(practiceDays.date),
      lastCreatedAt: max(exerciseLogs.createdAt),
    })
    .from(exercises)
    .leftJoin(
      exerciseLogs,
      and(
        eq(exerciseLogs.exerciseId, exercises.id),
        eq(exerciseLogs.userId, userId),
      ),
    )
    .leftJoin(practiceDays, eq(practiceDays.id, exerciseLogs.dayId))
    .where(visibleTo(userId))
    .groupBy(exercises.id);

  return rows
    .sort((a, b) => {
      if (a.lastDate !== b.lastDate) {
        if (!a.lastDate) return 1;
        if (!b.lastDate) return -1;
        return a.lastDate < b.lastDate ? 1 : -1;
      }
      const byTime =
        (b.lastCreatedAt?.getTime() ?? 0) - (a.lastCreatedAt?.getTime() ?? 0);
      return byTime || collator.compare(a.name, b.name);
    })
    .map((row) => ({
      id: row.id,
      name: row.name,
      custom: row.ownerId !== null,
      lastPracticed: row.lastDate,
      pattern: parsePattern(row.pattern),
    }));
}

export async function findVisibleExercise(
  db: Db,
  userId: string,
  exerciseId: string,
) {
  if (!isUuid(exerciseId)) return null;
  const [exercise] = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      ownerId: exercises.userId,
      pattern: exercises.pattern,
    })
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), visibleTo(userId)))
    .limit(1);
  if (!exercise) return null;
  return {
    id: exercise.id,
    name: exercise.name,
    // Solo los propios se pueden editar; los estándar son de todos.
    custom: exercise.ownerId !== null,
    pattern: parsePattern(exercise.pattern),
  };
}

export const exerciseNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Escribe un nombre" })
  .max(80, { error: "El nombre no puede superar 80 caracteres" });

export type CreateExerciseResult =
  | { ok: true; exercise: PickerExercise }
  | { ok: false; error: string };

const DUPLICATE = "Ya existe un ejercicio con ese nombre";

export async function createCustomExercise(
  db: Db,
  userId: string,
  rawName: string,
): Promise<CreateExerciseResult> {
  const parsed = exerciseNameSchema.safeParse(rawName);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const name = parsed.data;
  // El índice único solo impide repetir dentro del mismo dueño; el choque con
  // un rudimento estándar se comprueba aquí con la misma normalización que la BD.
  const [standard] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(
      and(
        isNull(exercises.userId),
        eq(exercises.normalizedName, sql`lower(btrim(${name}))`),
      ),
    )
    .limit(1);
  if (standard) return { ok: false, error: DUPLICATE };

  const [created] = await db
    .insert(exercises)
    .values({ userId, name })
    .onConflictDoNothing()
    .returning({ id: exercises.id, name: exercises.name });
  if (!created) return { ok: false, error: DUPLICATE };
  return {
    ok: true,
    exercise: { ...created, custom: true, lastPracticed: null, pattern: null },
  };
}

export type SavePatternResult =
  | { ok: true; pattern: Pattern }
  | { ok: false; error: string }
  | { ok: false; notFound: true };

/** Guarda el patrón de un ejercicio propio. Los estándar y los ajenos no se tocan. */
export async function saveExercisePattern(
  db: Db,
  userId: string,
  exerciseId: string,
  input: unknown,
): Promise<SavePatternResult> {
  if (!isUuid(exerciseId)) return { ok: false, notFound: true };
  const parsed = patternSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const [saved] = await db
    .update(exercises)
    .set({ pattern: parsed.data })
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)))
    .returning({ id: exercises.id });
  return saved
    ? { ok: true, pattern: parsed.data }
    : { ok: false, notFound: true };
}

/** Ejercicios que el usuario ha registrado alguna vez, del más reciente al más antiguo. */
export async function listPracticedExercises(db: Db, userId: string) {
  const all = await listExercisesForPicker(db, userId);
  return all.filter((exercise) => exercise.lastPracticed !== null);
}
