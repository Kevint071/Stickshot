import { and, asc, between, desc, eq } from "drizzle-orm";
import { exerciseLogs, exercises, practiceDays } from "@/db/schema";
import type { Db } from "@/db/types";

/** Fechas con día del usuario dentro de un rango (ambos extremos incluidos). */
export async function dayDatesBetween(
  db: Db,
  userId: string,
  from: string,
  to: string,
) {
  const rows = await db
    .select({ date: practiceDays.date })
    .from(practiceDays)
    .where(
      and(
        eq(practiceDays.userId, userId),
        between(practiceDays.date, from, to),
      ),
    );
  return rows.map((row) => row.date);
}

/** Historial: días del usuario del más reciente al más antiguo. */
export function listDays(db: Db, userId: string) {
  return db
    .select({
      id: practiceDays.id,
      date: practiceDays.date,
      mood: practiceDays.mood,
      note: practiceDays.note,
    })
    .from(practiceDays)
    .where(eq(practiceDays.userId, userId))
    .orderBy(desc(practiceDays.date));
}

export async function getDay(db: Db, userId: string, date: string) {
  const [day] = await db
    .select({
      id: practiceDays.id,
      date: practiceDays.date,
      mood: practiceDays.mood,
      note: practiceDays.note,
    })
    .from(practiceDays)
    .where(and(eq(practiceDays.userId, userId), eq(practiceDays.date, date)));
  if (!day) return null;
  const logs = await db
    .select({
      id: exerciseLogs.id,
      exerciseName: exercises.name,
      hand: exerciseLogs.hand,
      bpm: exerciseLogs.bpm,
      subdivision: exerciseLogs.subdivision,
      durationSeconds: exerciseLogs.durationSeconds,
      sets: exerciseLogs.sets,
      cleanliness: exerciseLogs.cleanliness,
      note: exerciseLogs.note,
    })
    .from(exerciseLogs)
    .innerJoin(exercises, eq(exercises.id, exerciseLogs.exerciseId))
    .where(and(eq(exerciseLogs.dayId, day.id), eq(exerciseLogs.userId, userId)))
    .orderBy(asc(exerciseLogs.createdAt));
  return { ...day, logs };
}

/** Cambia el estado de ánimo y la nota de un día existente del usuario. */
export async function updateDay(
  db: Db,
  userId: string,
  date: string,
  values: { mood: number; note: string | null },
) {
  const updated = await db
    .update(practiceDays)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(practiceDays.userId, userId), eq(practiceDays.date, date)))
    .returning({ id: practiceDays.id });
  return updated.length > 0;
}
