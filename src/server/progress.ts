import { and, eq, gte, inArray, ne } from "drizzle-orm";
import { exerciseLogs, exercises, practiceDays } from "@/db/schema";
import type { Db } from "@/db/types";
import {
  availableTiers,
  computeBrokenRecords,
  computeHistory,
  currentRecords,
  defaultTier,
  isTier,
  type RecordLog,
  TIERS,
} from "@/lib/records";
import { findVisibleExercise } from "./exercises";

export const RECENT_BROKEN_LIMIT = 20;

/**
 * Registros del usuario que pueden contar para récords. El filtro de sucios y
 * de menos de 15 s se adelanta a SQL solo para traer menos filas; la regla
 * vive en src/lib/records.
 */
async function loadRecordLogs(
  db: Db,
  userId: string,
  exerciseId?: string,
): Promise<RecordLog[]> {
  return db
    .select({
      id: exerciseLogs.id,
      exerciseId: exerciseLogs.exerciseId,
      hand: exerciseLogs.hand,
      date: practiceDays.date,
      createdAt: exerciseLogs.createdAt,
      durationSeconds: exerciseLogs.durationSeconds,
      bpm: exerciseLogs.bpm,
      subdivision: exerciseLogs.subdivision,
      cleanliness: exerciseLogs.cleanliness,
    })
    .from(exerciseLogs)
    .innerJoin(practiceDays, eq(practiceDays.id, exerciseLogs.dayId))
    .where(
      and(
        eq(exerciseLogs.userId, userId),
        ne(exerciseLogs.cleanliness, "dirty"),
        gte(exerciseLogs.durationSeconds, TIERS[0]),
        exerciseId ? eq(exerciseLogs.exerciseId, exerciseId) : undefined,
      ),
    );
}

/** Últimos récords batidos (máx. 20), del más reciente al más antiguo. */
export async function getRecentBrokenRecords(db: Db, userId: string) {
  const broken = computeBrokenRecords(await loadRecordLogs(db, userId)).slice(
    0,
    RECENT_BROKEN_LIMIT,
  );
  if (!broken.length) return [];
  const ids = [...new Set(broken.map((b) => b.exerciseId))];
  const names = new Map(
    (
      await db
        .select({ id: exercises.id, name: exercises.name })
        .from(exercises)
        .where(inArray(exercises.id, ids))
    ).map((row) => [row.id, row.name]),
  );
  return broken.map((b) => ({
    ...b,
    exerciseName: names.get(b.exerciseId) ?? "",
  }));
}

/**
 * Datos de la gráfica de un ejercicio: tramos con datos, tramo elegido (el
 * pedido si tiene datos, si no el de por defecto), historia y récord por mano.
 */
export async function getExerciseProgress(
  db: Db,
  userId: string,
  exerciseId: string,
  requestedTier?: string,
) {
  const exercise = await findVisibleExercise(db, userId, exerciseId);
  if (!exercise) return null;
  const logs = await loadRecordLogs(db, userId, exercise.id);
  const tiers = availableTiers(logs, exercise.id);
  const requested = Number(requestedTier);
  const tier =
    isTier(requested) && tiers.includes(requested)
      ? requested
      : defaultTier(tiers);
  return {
    exercise,
    tiers,
    tier,
    history: tier ? computeHistory(logs, exercise.id, tier) : [],
    current: tier ? currentRecords(logs, exercise.id, tier) : {},
  };
}
