import { beforeEach, describe, expect, test } from "vitest";
import { createUser, setupTestDb } from "@/test/db";
import { listExercisesForPicker } from "./exercises";
import { type SaveLogInput, saveLog } from "./logs";
import {
  getBrokenRecordsForLog,
  getExerciseSummaries,
  getNextChallenge,
  getPracticeTargets,
} from "./progress";
import { getDailyTotals, getDashboard } from "./stats";

const t = setupTestDb();
let ana: string;
let bea: string;
let paradiddle: string;

beforeEach(async () => {
  ana = await createUser(t.db, "ana@ejemplo.com");
  bea = await createUser(t.db, "bea@ejemplo.com");
  const list = await listExercisesForPicker(t.db, ana);
  paradiddle = list.find((e) => e.name === "Single Paradiddle")?.id ?? "";
});

async function practice(
  overrides: Partial<SaveLogInput> & { userId?: string } = {},
) {
  const { userId = ana, ...rest } = overrides;
  const result = await saveLog(t.db, userId, {
    exerciseId: paradiddle,
    date: "2026-10-15",
    hand: "right",
    bpm: 120,
    subdivision: "sixteenth",
    durationSeconds: 60,
    sets: 1,
    cleanliness: "clean",
    note: null,
    mood: 3,
    ...rest,
  });
  if (result.status !== "saved") throw new Error(result.status);
  return result.logId;
}

describe("getDailyTotals", () => {
  test("segundos por día (duración × series), solo del usuario", async () => {
    await practice({ durationSeconds: 60, sets: 2 });
    await practice({ durationSeconds: 30 });
    await practice({ date: "2026-10-16" });
    await practice({ userId: bea });
    expect(await getDailyTotals(t.db, ana)).toEqual([
      { date: "2026-10-15", seconds: 150, logs: 2 },
      { date: "2026-10-16", seconds: 60, logs: 1 },
    ]);
  });
});

describe("getDashboard", () => {
  test("racha, semana, mes y récords recientes", async () => {
    await practice({ date: "2026-09-30", bpm: 100 });
    await practice({ date: "2026-10-15", bpm: 110 });
    await practice({ date: "2026-10-16", bpm: 120, sets: 2 });
    const dashboard = await getDashboard(t.db, ana, "2026-10-16");
    expect(dashboard.streak).toEqual({ current: 2, best: 2 });
    expect(dashboard.weekSeconds).toBe(180);
    expect(dashboard.monthDays).toBe(2);
    expect(dashboard.recordsLast30).toBe(2);
    expect(dashboard.practicedToday).toBe(true);
    expect(
      dashboard.heatmap.flat().find((c) => c.date === "2026-10-16"),
    ).toMatchObject({ seconds: 120, level: 1 });
  });
});

describe("getBrokenRecordsForLog", () => {
  test("solo los récords que batió ese registro", async () => {
    await practice({ bpm: 120 });
    const better = await practice({ bpm: 130 });
    const worse = await practice({ bpm: 110 });
    expect(
      (await getBrokenRecordsForLog(t.db, ana, paradiddle, better)).map((r) => [
        r.tier,
        r.value,
        r.previous,
      ]),
    ).toEqual([
      [15, 520, 480],
      [30, 520, 480],
      [60, 520, 480],
    ]);
    expect(await getBrokenRecordsForLog(t.db, ana, paradiddle, worse)).toEqual(
      [],
    );
  });
});

describe("getPracticeTargets y getExerciseSummaries", () => {
  test("récord por mano en el tramo de referencia", async () => {
    await practice({ bpm: 120 });
    await practice({ bpm: 100, hand: "left" });
    await practice({ bpm: 130, date: "2026-10-16" });
    expect((await getPracticeTargets(t.db, ana))[paradiddle]).toEqual({
      tier: 60,
      records: { right: 520, left: 400 },
    });
    const [summary] = await getExerciseSummaries(t.db, ana);
    expect(summary).toMatchObject({
      id: paradiddle,
      tier: 60,
      records: { right: 520, left: 400 },
      curve: [480, 520],
    });
  });
});

describe("getNextChallenge", () => {
  test("sin registros no hay reto", async () => {
    expect(await getNextChallenge(t.db, ana)).toBeNull();
  });

  test("un poco por encima del récord, en la subdivisión del último registro", async () => {
    await practice({ bpm: 120, subdivision: "sixteenth" });
    await practice({ bpm: 150, subdivision: "eighth", date: "2026-10-16" });
    // Récord 480 gpm; en corcheas son 240 BPM y el reto, +7.
    expect(await getNextChallenge(t.db, ana)).toMatchObject({
      exerciseId: paradiddle,
      exerciseName: "Single Paradiddle",
      subdivision: "eighth",
      recordBpm: 240,
      targetBpm: 247,
    });
  });

  test("si el último no cuenta para récord, parte de su tempo", async () => {
    await practice({ bpm: 90, cleanliness: "dirty" });
    expect(await getNextChallenge(t.db, ana)).toMatchObject({
      recordBpm: undefined,
      targetBpm: 93,
    });
  });
});
