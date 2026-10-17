import { and, desc, eq, gte, inArray, ne } from "drizzle-orm";
import {
  exerciseLogs,
  exercises,
  type Hand,
  practiceDays,
  type Subdivision,
} from "@/db/schema";
import type { Db } from "@/db/types";
import {
  availableTiers,
  bpmFor,
  computeBrokenRecords,
  computeHistory,
  currentRecords,
  defaultTier,
  isTier,
  type RecordLog,
  TIERS,
  type Tier,
} from "@/lib/records";
import { challengeStep } from "@/lib/stats";
import { findVisibleExercise, listPracticedExercises } from "./exercises";

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

/** Últimos récords batidos (20 por defecto), del más reciente al más antiguo. */
export async function getRecentBrokenRecords(
  db: Db,
  userId: string,
  limit = RECENT_BROKEN_LIMIT,
) {
  const broken = computeBrokenRecords(await loadRecordLogs(db, userId)).slice(
    0,
    limit,
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

/** Récords que batió un registro recién guardado (vacío si no batió ninguno). */
export async function getBrokenRecordsForLog(
  db: Db,
  userId: string,
  exerciseId: string,
  logId: string,
) {
  const logs = await loadRecordLogs(db, userId, exerciseId);
  return computeBrokenRecords(logs).filter((record) => record.logId === logId);
}

export type HandRecords = Partial<Record<Hand, number>>;
export type ExerciseTarget = { tier: Tier; records: HandRecords };

/** Tramo de referencia de cada ejercicio y récord por mano, para retarse al practicar. */
function targetsFrom(logs: RecordLog[], exerciseIds: string[]) {
  const targets = new Map<string, ExerciseTarget>();
  for (const id of exerciseIds) {
    const tier = defaultTier(availableTiers(logs, id));
    if (tier)
      targets.set(id, { tier, records: currentRecords(logs, id, tier) });
  }
  return targets;
}

export async function getPracticeTargets(
  db: Db,
  userId: string,
): Promise<Record<string, ExerciseTarget>> {
  const logs = await loadRecordLogs(db, userId);
  const ids = [...new Set(logs.map((log) => log.exerciseId))];
  return Object.fromEntries(targetsFrom(logs, ids));
}

/** Ejercicios practicados con su récord actual y la curva del tramo de referencia. */
export async function getExerciseSummaries(db: Db, userId: string) {
  const [practiced, logs] = await Promise.all([
    listPracticedExercises(db, userId),
    loadRecordLogs(db, userId),
  ]);
  const targets = targetsFrom(
    logs,
    practiced.map((exercise) => exercise.id),
  );
  return practiced.map((exercise) => {
    const target = targets.get(exercise.id);
    const history = target
      ? computeHistory(logs, exercise.id, target.tier)
      : [];
    return {
      ...exercise,
      tier: target?.tier,
      records: target?.records ?? {},
      // Mejor de las dos manos en cada cambio de récord: basta para la miniatura.
      curve: history.map((point) =>
        Math.max(point.right ?? 0, point.left ?? 0),
      ),
    };
  });
}

export type NextChallenge = {
  exerciseId: string;
  exerciseName: string;
  hand: Hand;
  subdivision: Subdivision;
  tier?: Tier;
  /** Récord actual en BPM con la subdivisión del último registro. */
  recordBpm?: number;
  targetBpm: number;
};

/**
 * Siguiente reto: el último ejercicio anotado, con su misma mano y subdivisión,
 * un poco por encima del récord (o del último tempo si aún no hay récord).
 */
export async function getNextChallenge(
  db: Db,
  userId: string,
): Promise<NextChallenge | null> {
  const [last] = await db
    .select({
      exerciseId: exerciseLogs.exerciseId,
      exerciseName: exercises.name,
      hand: exerciseLogs.hand,
      subdivision: exerciseLogs.subdivision,
      bpm: exerciseLogs.bpm,
    })
    .from(exerciseLogs)
    .innerJoin(practiceDays, eq(practiceDays.id, exerciseLogs.dayId))
    .innerJoin(exercises, eq(exercises.id, exerciseLogs.exerciseId))
    .where(eq(exerciseLogs.userId, userId))
    .orderBy(desc(practiceDays.date), desc(exerciseLogs.createdAt))
    .limit(1);
  if (!last) return null;

  const logs = await loadRecordLogs(db, userId, last.exerciseId);
  const target = targetsFrom(logs, [last.exerciseId]).get(last.exerciseId);
  const record = target?.records[last.hand];
  const recordBpm =
    record !== undefined ? bpmFor(record, last.subdivision) : undefined;
  const base = recordBpm ?? last.bpm;
  return {
    exerciseId: last.exerciseId,
    exerciseName: last.exerciseName,
    hand: last.hand,
    subdivision: last.subdivision,
    tier: target?.tier,
    recordBpm,
    targetBpm: Math.min(400, base + challengeStep(base)),
  };
}
