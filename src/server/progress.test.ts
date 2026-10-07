import { beforeEach, describe, expect, test } from "vitest";
import { createUser, setupTestDb } from "@/test/db";
import { listExercisesForPicker } from "./exercises";
import { type SaveLogInput, saveLog } from "./logs";
import { getExerciseProgress, getRecentBrokenRecords } from "./progress";

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
    date: "2026-10-01",
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
}

describe("getRecentBrokenRecords", () => {
  test("escenario de varios tramos, con nombre del ejercicio", async () => {
    await practice({ durationSeconds: 15, bpm: 140 }); // 560 en 15 s
    await practice({ durationSeconds: 30, bpm: 130 }); // 520 en 30 s
    await practice({ durationSeconds: 60, bpm: 125 }); // 500 en 1 min
    await practice({ date: "2026-10-06", durationSeconds: 65, bpm: 135 });
    const broken = await getRecentBrokenRecords(t.db, ana);
    expect(broken).toEqual([
      expect.objectContaining({
        exerciseId: paradiddle,
        exerciseName: "Single Paradiddle",
        hand: "right",
        tier: 30,
        value: 540,
        previous: 520,
        date: "2026-10-06",
      }),
      expect.objectContaining({ tier: 60, value: 540, previous: 500 }),
    ]);
  });

  test("como máximo 20, los más recientes", async () => {
    for (let i = 0; i < 25; i++) {
      await practice({
        date: `2026-09-${String(i + 1).padStart(2, "0")}`,
        durationSeconds: 15,
        bpm: 100 + i,
      });
    }
    const broken = await getRecentBrokenRecords(t.db, ana);
    expect(broken).toHaveLength(20);
    expect(broken[0]).toMatchObject({ date: "2026-09-25", value: 124 * 4 });
  });

  test("no mezcla registros de otros usuarios", async () => {
    await practice({ userId: bea, bpm: 100 });
    await practice({ bpm: 110 });
    expect(await getRecentBrokenRecords(t.db, ana)).toEqual([]);
  });
});

describe("getExerciseProgress", () => {
  test("tramo por defecto, tramos con datos, historia y récord por mano", async () => {
    await practice({ durationSeconds: 70, bpm: 120 });
    await practice({ durationSeconds: 70, bpm: 110, hand: "left" });
    const progress = await getExerciseProgress(t.db, ana, paradiddle);
    expect(progress).toMatchObject({
      exercise: { name: "Single Paradiddle" },
      tiers: [15, 30, 60],
      tier: 60,
      current: { right: 480, left: 440 },
    });
    expect(progress?.history).toHaveLength(1);
  });

  test("respeta el tramo pedido si tiene datos", async () => {
    await practice({ durationSeconds: 70 });
    const progress = await getExerciseProgress(t.db, ana, paradiddle, "30");
    expect(progress?.tier).toBe(30);
  });

  test("ignora un tramo pedido sin datos o inválido", async () => {
    await practice({ durationSeconds: 70 });
    expect(
      (await getExerciseProgress(t.db, ana, paradiddle, "300"))?.tier,
    ).toBe(60);
    expect(
      (await getExerciseProgress(t.db, ana, paradiddle, "abc"))?.tier,
    ).toBe(60);
  });

  test("sin registros que cuenten no hay tramo ni historia", async () => {
    await practice({ cleanliness: "dirty" });
    const progress = await getExerciseProgress(t.db, ana, paradiddle);
    expect(progress).toMatchObject({ tiers: [], tier: undefined, history: [] });
  });

  test("solo usa los registros del usuario", async () => {
    await practice({ userId: bea, bpm: 200 });
    await practice({ bpm: 120 });
    const progress = await getExerciseProgress(t.db, ana, paradiddle);
    expect(progress?.current).toEqual({ right: 480 });
  });

  test("un ejercicio propio de otro usuario no existe", async () => {
    expect(
      await getExerciseProgress(
        t.db,
        ana,
        "00000000-0000-4000-8000-000000000000",
      ),
    ).toBeNull();
  });
});
