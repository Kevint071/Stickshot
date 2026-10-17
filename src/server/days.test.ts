import { beforeEach, describe, expect, test } from "vitest";
import { createUser, setupTestDb } from "@/test/db";
import { getDay, listDays, updateDay } from "./days";
import { listExercisesForPicker } from "./exercises";
import { type SaveLogInput, saveLog } from "./logs";

const t = setupTestDb();
let ana: string;
let bea: string;

beforeEach(async () => {
  ana = await createUser(t.db, "ana@ejemplo.com");
  bea = await createUser(t.db, "bea@ejemplo.com");
});

async function practice(
  userId: string,
  date: string,
  overrides: Partial<SaveLogInput> = {},
) {
  const [exercise] = await listExercisesForPicker(t.db, userId);
  const result = await saveLog(t.db, userId, {
    exerciseId: exercise.id,
    date,
    hand: "right",
    bpm: 120,
    subdivision: "sixteenth",
    durationSeconds: 60,
    sets: 1,
    cleanliness: "clean",
    note: null,
    mood: 3,
    ...overrides,
  });
  if (result.status !== "saved") throw new Error(result.status);
  return result.logId;
}

describe("listDays", () => {
  test("del más reciente al más antiguo", async () => {
    await practice(ana, "2026-10-01");
    await practice(ana, "2026-10-05");
    await practice(ana, "2026-10-03");
    const dates = (await listDays(t.db, ana)).map((d) => d.date);
    expect(dates).toEqual(["2026-10-05", "2026-10-03", "2026-10-01"]);
  });

  test("suma registros, tiempo tocado y tempo máximo", async () => {
    await practice(ana, "2026-10-01", { durationSeconds: 60, sets: 3 });
    await practice(ana, "2026-10-01", { durationSeconds: 30, bpm: 140 });
    const [day] = await listDays(t.db, ana);
    expect(day).toMatchObject({ logs: 2, seconds: 210, topBpm: 140 });
  });

  test("solo los días del usuario", async () => {
    await practice(ana, "2026-10-01");
    await practice(bea, "2026-10-02");
    expect((await listDays(t.db, ana)).map((d) => d.date)).toEqual([
      "2026-10-01",
    ]);
  });
});

describe("getDay", () => {
  test("devuelve estado de ánimo, nota y registros en orden de anotación", async () => {
    const first = await practice(ana, "2026-10-03", { mood: 5 });
    const second = await practice(ana, "2026-10-03", { bpm: 130 });
    const day = await getDay(t.db, ana, "2026-10-03");
    expect(day).toMatchObject({ date: "2026-10-03", mood: 5, note: null });
    expect(day?.logs.map((l) => l.id)).toEqual([first, second]);
  });

  test("el día de otro usuario no existe", async () => {
    await practice(bea, "2026-10-03");
    expect(await getDay(t.db, ana, "2026-10-03")).toBeNull();
  });
});

describe("updateDay", () => {
  test("cambia el estado de ánimo y la nota", async () => {
    await practice(ana, "2026-10-03", { mood: 3 });
    expect(
      await updateDay(t.db, ana, "2026-10-03", { mood: 4, note: "Cansado" }),
    ).toBe(true);
    expect(await getDay(t.db, ana, "2026-10-03")).toMatchObject({
      mood: 4,
      note: "Cansado",
    });
  });

  test("no crea días ni toca los de otros usuarios", async () => {
    await practice(bea, "2026-10-03", { mood: 3 });
    expect(
      await updateDay(t.db, ana, "2026-10-03", { mood: 1, note: null }),
    ).toBe(false);
    expect((await getDay(t.db, bea, "2026-10-03"))?.mood).toBe(3);
    expect(await listDays(t.db, ana)).toHaveLength(0);
  });
});
