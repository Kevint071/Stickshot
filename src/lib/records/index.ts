import type { Cleanliness, Hand, Subdivision } from "@/db/schema";

/** Tramos en segundos: 15 s, 30 s, 1, 2, 3 y 5 min. */
export const TIERS = [15, 30, 60, 120, 180, 300] as const;
export type Tier = (typeof TIERS)[number];

export const DEFAULT_TIER: Tier = 60;

/** Lo mínimo de un registro que hace falta para calcular récords. */
export type RecordLog = {
  id: string;
  exerciseId: string;
  hand: Hand;
  date: string; // YYYY-MM-DD
  createdAt: Date;
  durationSeconds: number;
  bpm: number;
  subdivision: Subdivision;
  cleanliness: Cleanliness;
};

const NOTES_PER_BEAT: Record<Subdivision, number> = {
  quarter: 1,
  eighth: 2,
  triplet: 3,
  sixteenth: 4,
  sextuplet: 6,
  thirty_second: 8,
};

/** Golpes por minuto: BPM por notas por pulso. */
export function strokesPerMinute(bpm: number, subdivision: Subdivision) {
  return bpm * NOTES_PER_BEAT[subdivision];
}

/** Tramos para los que cuenta una duración por serie (el suyo y todos los más cortos). */
export function qualifyingTiers(durationSeconds: number): Tier[] {
  return TIERS.filter((tier) => durationSeconds >= tier);
}

/** Un registro sucio no cuenta; "casi" y "limpio" valen igual. */
function counts(log: RecordLog) {
  return (
    log.cleanliness !== "dirty" &&
    qualifyingTiers(log.durationSeconds).length > 0
  );
}

/** Orden cronológico: fecha del día, momento de creación y, por estabilidad, id. */
function chronological(a: RecordLog, b: RecordLog) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const byTime = a.createdAt.getTime() - b.createdAt.getTime();
  if (byTime !== 0) return byTime;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function keyOf(exerciseId: string, hand: Hand, tier: Tier) {
  return `${exerciseId}|${hand}|${tier}`;
}

export type CurrentRecord = {
  exerciseId: string;
  hand: Hand;
  tier: Tier;
  value: number;
  logId: string;
};

/** Récord actual por ejercicio, mano y tramo. */
export function computeRecords(logs: RecordLog[]): CurrentRecord[] {
  const best = new Map<string, CurrentRecord>();
  for (const log of logs.filter(counts).sort(chronological)) {
    const value = strokesPerMinute(log.bpm, log.subdivision);
    for (const tier of qualifyingTiers(log.durationSeconds)) {
      const key = keyOf(log.exerciseId, log.hand, tier);
      const current = best.get(key);
      if (!current || value > current.value) {
        best.set(key, {
          exerciseId: log.exerciseId,
          hand: log.hand,
          tier,
          value,
          logId: log.id,
        });
      }
    }
  }
  return [...best.values()];
}

export type BrokenRecord = {
  logId: string;
  exerciseId: string;
  hand: Hand;
  tier: Tier;
  date: string;
  createdAt: Date;
  value: number;
  previous: number;
};

/**
 * Récords batidos: registros que superan estrictamente el récord previo en
 * orden cronológico. La primera marca no cuenta. Del más reciente al más antiguo.
 */
export function computeBrokenRecords(logs: RecordLog[]): BrokenRecord[] {
  const best = new Map<string, number>();
  // Agrupado por registro para invertir el orden de los registros sin invertir
  // el de sus tramos (dentro de un mismo registro, del más corto al más largo).
  const byLog: BrokenRecord[][] = [];
  for (const log of logs.filter(counts).sort(chronological)) {
    const value = strokesPerMinute(log.bpm, log.subdivision);
    const broken: BrokenRecord[] = [];
    for (const tier of qualifyingTiers(log.durationSeconds)) {
      const key = keyOf(log.exerciseId, log.hand, tier);
      const previous = best.get(key);
      if (previous === undefined || value > previous) best.set(key, value);
      if (previous !== undefined && value > previous) {
        broken.push({
          logId: log.id,
          exerciseId: log.exerciseId,
          hand: log.hand,
          tier,
          date: log.date,
          createdAt: log.createdAt,
          value,
          previous,
        });
      }
    }
    if (broken.length) byLog.push(broken);
  }
  return byLog.reverse().flat();
}

function logsFor(logs: RecordLog[], exerciseId: string, tier: Tier) {
  return logs
    .filter(
      (log) =>
        log.exerciseId === exerciseId &&
        counts(log) &&
        log.durationSeconds >= tier,
    )
    .sort(chronological);
}

export type HistoryPoint = { date: string; right?: number; left?: number };

/**
 * Evolución del récord de un ejercicio en un tramo: un punto por cada fecha en
 * la que cambia el récord de alguna mano, con el valor vigente al final del día.
 */
export function computeHistory(
  logs: RecordLog[],
  exerciseId: string,
  tier: Tier,
): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const current: Partial<Record<Hand, number>> = {};
  for (const log of logsFor(logs, exerciseId, tier)) {
    const value = strokesPerMinute(log.bpm, log.subdivision);
    const previous = current[log.hand];
    if (previous !== undefined && value <= previous) continue;
    current[log.hand] = value;
    const last = points.at(-1);
    if (last?.date === log.date) Object.assign(last, current);
    else points.push({ date: log.date, ...current });
  }
  return points;
}

/** Récord actual de cada mano en un tramo. */
export function currentRecords(
  logs: RecordLog[],
  exerciseId: string,
  tier: Tier,
): Partial<Record<Hand, number>> {
  const { date: _date, ...byHand } =
    computeHistory(logs, exerciseId, tier).at(-1) ?? {};
  return byHand;
}

/** Tramos con algún registro que cuenta para el ejercicio. */
export function availableTiers(logs: RecordLog[], exerciseId: string): Tier[] {
  const longest = Math.max(
    0,
    ...logs
      .filter((log) => log.exerciseId === exerciseId && counts(log))
      .map((log) => log.durationSeconds),
  );
  return qualifyingTiers(longest);
}

/** 1 min si tiene datos; si no, el tramo más cercano (el más corto si empatan). */
export function defaultTier(available: readonly Tier[]): Tier | undefined {
  if (available.includes(DEFAULT_TIER)) return DEFAULT_TIER;
  let chosen: Tier | undefined;
  for (const tier of available) {
    const distance = Math.abs(tier - DEFAULT_TIER);
    const best =
      chosen === undefined ? Infinity : Math.abs(chosen - DEFAULT_TIER);
    if (
      distance < best ||
      (distance === best && chosen !== undefined && tier < chosen)
    ) {
      chosen = tier;
    }
  }
  return chosen;
}

export function isTier(value: number): value is Tier {
  return (TIERS as readonly number[]).includes(value);
}
