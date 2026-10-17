import { eq, sql } from "drizzle-orm";
import { exerciseLogs, practiceDays } from "@/db/schema";
import type { Db } from "@/db/types";
import {
  addDays,
  computeStreak,
  type DayTotal,
  heatmap,
  secondsBetween,
} from "@/lib/stats";
import { getNextChallenge, getRecentBrokenRecords } from "./progress";

export const HEATMAP_WEEKS = 26;

type Broken = Awaited<ReturnType<typeof getRecentBrokenRecords>>[number];

/**
 * Un registro bate a la vez el récord de varios tramos (15 s, 30 s, 1 min…).
 * Para el inicio se agrupa por registro y se queda el tramo más largo.
 */
function byLog(broken: Broken[]) {
  const groups = new Map<string, Broken & { tiers: number }>();
  for (const record of broken) {
    const seen = groups.get(record.logId);
    if (!seen) groups.set(record.logId, { ...record, tiers: 1 });
    else if (record.tier > seen.tier)
      groups.set(record.logId, { ...record, tiers: seen.tiers + 1 });
    else seen.tiers += 1;
  }
  return [...groups.values()];
}

/** Segundos tocados (duración × series) y registros de cada día del usuario. */
export async function getDailyTotals(
  db: Db,
  userId: string,
): Promise<DayTotal[]> {
  return db
    .select({
      date: practiceDays.date,
      seconds: sql<number>`coalesce(sum(${exerciseLogs.durationSeconds} * ${exerciseLogs.sets}), 0)::int`,
      logs: sql<number>`count(${exerciseLogs.id})::int`,
    })
    .from(practiceDays)
    .leftJoin(exerciseLogs, eq(exerciseLogs.dayId, practiceDays.id))
    .where(eq(practiceDays.userId, userId))
    .groupBy(practiceDays.date)
    .orderBy(practiceDays.date);
}

/** Todo lo que muestra el inicio. `today` es la fecha del calendario del usuario. */
export async function getDashboard(db: Db, userId: string, today: string) {
  const [totals, broken, challenge] = await Promise.all([
    getDailyTotals(db, userId),
    getRecentBrokenRecords(db, userId, Number.POSITIVE_INFINITY),
    getNextChallenge(db, userId),
  ]);
  const practiced = totals.filter((day) => day.logs > 0);
  const moments = byLog(broken);
  const monthStart = `${today.slice(0, 7)}-01`;
  return {
    streak: computeStreak(
      practiced.map((day) => day.date),
      today,
    ),
    weekSeconds: secondsBetween(totals, addDays(today, -6), today),
    monthDays: practiced.filter(
      (day) => day.date >= monthStart && day.date <= today,
    ).length,
    recordsLast30: moments.filter(
      (record) => record.date >= addDays(today, -29),
    ).length,
    practicedToday: practiced.some((day) => day.date === today),
    heatmap: heatmap(totals, today, HEATMAP_WEEKS),
    totalSeconds: totals.reduce((sum, day) => sum + day.seconds, 0),
    totalDays: practiced.length,
    broken: moments.slice(0, 6),
    challenge,
  };
}

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
