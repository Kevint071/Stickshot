import { and, eq } from "drizzle-orm";
import { exerciseLogs, exercises, practiceDays } from "@/db/schema";
import type { Db } from "@/db/types";
import { isUuid } from "@/lib/ids";
import type { LogInput } from "@/lib/validation/log";
import { findVisibleExercise } from "./exercises";

export type SaveLogInput = LogInput;

export type SaveLogResult =
  | { status: "saved"; logId: string; date: string }
  | { status: "needsMood" }
  | { status: "notFound" };

/**
 * Devuelve el día del usuario en esa fecha, creándolo si hace falta. Sin día y
 * sin carita devuelve null: el día solo nace con su primer registro y su carita.
 */
async function resolveDay(
  db: Db,
  userId: string,
  date: string,
  mood: number | undefined,
) {
  const where = and(
    eq(practiceDays.userId, userId),
    eq(practiceDays.date, date),
  );
  const [existing] = await db
    .select({ id: practiceDays.id })
    .from(practiceDays)
    .where(where);
  if (existing) return existing;
  if (mood === undefined) return null;
  const [created] = await db
    .insert(practiceDays)
    .values({ userId, date, mood })
    .onConflictDoNothing()
    .returning({ id: practiceDays.id });
  if (created) return created;
  // Otra petición creó el día a la vez: se usa el suyo.
  const [concurrent] = await db
    .select({ id: practiceDays.id })
    .from(practiceDays)
    .where(where);
  return concurrent ?? null;
}

function logValues(input: SaveLogInput) {
  return {
    exerciseId: input.exerciseId,
    hand: input.hand,
    bpm: input.bpm,
    subdivision: input.subdivision,
    durationSeconds: input.durationSeconds,
    sets: input.sets,
    cleanliness: input.cleanliness,
    note: input.note,
  };
}

export function saveLog(
  db: Db,
  userId: string,
  input: SaveLogInput,
): Promise<SaveLogResult> {
  return db.transaction(async (tx) => {
    if (!(await findVisibleExercise(tx, userId, input.exerciseId))) {
      return { status: "notFound" };
    }
    const day = await resolveDay(tx, userId, input.date, input.mood);
    if (!day) return { status: "needsMood" };
    const [log] = await tx
      .insert(exerciseLogs)
      .values({ ...logValues(input), userId, dayId: day.id })
      .returning({ id: exerciseLogs.id });
    return { status: "saved", logId: log.id, date: input.date };
  });
}

export function updateLog(
  db: Db,
  userId: string,
  logId: string,
  input: SaveLogInput,
): Promise<SaveLogResult> {
  if (!isUuid(logId)) return Promise.resolve({ status: "notFound" });
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: exerciseLogs.id })
      .from(exerciseLogs)
      .where(and(eq(exerciseLogs.id, logId), eq(exerciseLogs.userId, userId)));
    if (!existing) return { status: "notFound" };
    if (!(await findVisibleExercise(tx, userId, input.exerciseId))) {
      return { status: "notFound" };
    }
    const day = await resolveDay(tx, userId, input.date, input.mood);
    if (!day) return { status: "needsMood" };
    await tx
      .update(exerciseLogs)
      .set({ ...logValues(input), dayId: day.id, updatedAt: new Date() })
      .where(and(eq(exerciseLogs.id, logId), eq(exerciseLogs.userId, userId)));
    return { status: "saved", logId, date: input.date };
  });
}

/** Borra un registro propio. El día se conserva aunque quede vacío. */
export async function deleteLog(db: Db, userId: string, logId: string) {
  if (!isUuid(logId)) return false;
  const deleted = await db
    .delete(exerciseLogs)
    .where(and(eq(exerciseLogs.id, logId), eq(exerciseLogs.userId, userId)))
    .returning({ id: exerciseLogs.id });
  return deleted.length > 0;
}

export type LogDetail = Awaited<ReturnType<typeof getLog>>;

export async function getLog(db: Db, userId: string, logId: string) {
  if (!isUuid(logId)) return null;
  const [log] = await db
    .select({
      id: exerciseLogs.id,
      exerciseId: exerciseLogs.exerciseId,
      exerciseName: exercises.name,
      date: practiceDays.date,
      hand: exerciseLogs.hand,
      bpm: exerciseLogs.bpm,
      subdivision: exerciseLogs.subdivision,
      durationSeconds: exerciseLogs.durationSeconds,
      sets: exerciseLogs.sets,
      cleanliness: exerciseLogs.cleanliness,
      note: exerciseLogs.note,
    })
    .from(exerciseLogs)
    .innerJoin(practiceDays, eq(practiceDays.id, exerciseLogs.dayId))
    .innerJoin(exercises, eq(exercises.id, exerciseLogs.exerciseId))
    .where(and(eq(exerciseLogs.id, logId), eq(exerciseLogs.userId, userId)));
  return log ?? null;
}
