import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";
import { exerciseLogs, practiceDays } from "@/db/schema";
import { createUser, setupTestDb } from "@/test/db";
import { createCustomExercise, listExercisesForPicker } from "./exercises";
import {
  deleteLog,
  getLog,
  type SaveLogInput,
  saveLog,
  updateLog,
} from "./logs";

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

function input(overrides: Partial<SaveLogInput> = {}): SaveLogInput {
  return {
    exerciseId: paradiddle,
    date: "2026-10-07",
    hand: "right",
    bpm: 140,
    subdivision: "sixteenth",
    durationSeconds: 80,
    sets: 3,
    cleanliness: "clean",
    note: null,
    ...overrides,
  };
}

const daysOf = (userId: string) =>
  t.db.select().from(practiceDays).where(eq(practiceDays.userId, userId));

describe("saveLog", () => {
  test("el primer registro de una fecha sin estado de ánimo pide el estado de ánimo y no guarda", async () => {
    const result = await saveLog(t.db, ana, input());
    expect(result).toEqual({ status: "needsMood" });
    expect(await daysOf(ana)).toHaveLength(0);
  });

  test("con estado de ánimo crea el día y el registro", async () => {
    const result = await saveLog(t.db, ana, input({ mood: 4 }));
    expect(result.status).toBe("saved");
    const days = await daysOf(ana);
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ date: "2026-10-07", mood: 4 });
  });

  test("el segundo registro reutiliza el día y no necesita estado de ánimo", async () => {
    await saveLog(t.db, ana, input({ mood: 4 }));
    const result = await saveLog(t.db, ana, input({ bpm: 150 }));
    expect(result.status).toBe("saved");
    expect(await daysOf(ana)).toHaveLength(1);
    const logs = await t.db.select().from(exerciseLogs);
    expect(logs).toHaveLength(2);
    expect(new Set(logs.map((l) => l.dayId)).size).toBe(1);
  });

  test("un estado de ánimo enviado en un día existente no cambia el del día", async () => {
    await saveLog(t.db, ana, input({ mood: 4 }));
    await saveLog(t.db, ana, input({ mood: 1 }));
    expect((await daysOf(ana))[0].mood).toBe(4);
  });

  test("cada usuario tiene su propio día para la misma fecha", async () => {
    await saveLog(t.db, ana, input({ mood: 4 }));
    const result = await saveLog(t.db, bea, input());
    expect(result).toEqual({ status: "needsMood" });
  });

  test("no se puede registrar el ejercicio propio de otro usuario", async () => {
    const created = await createCustomExercise(t.db, bea, "Singles de Bea");
    if (!created.ok) throw new Error("no creado");
    const result = await saveLog(
      t.db,
      ana,
      input({ exerciseId: created.exercise.id, mood: 3 }),
    );
    expect(result.status).toBe("notFound");
  });
});

describe("updateLog y deleteLog", () => {
  async function saved(overrides: Partial<SaveLogInput> = {}) {
    const result = await saveLog(t.db, ana, input({ mood: 4, ...overrides }));
    if (result.status !== "saved") throw new Error(result.status);
    return result.logId;
  }

  test("corrige los campos de un registro", async () => {
    const id = await saved({ bpm: 160 });
    const result = await updateLog(t.db, ana, id, input({ bpm: 150 }));
    expect(result.status).toBe("saved");
    expect((await getLog(t.db, ana, id))?.bpm).toBe(150);
  });

  test("mover un registro a una fecha sin día pide estado de ánimo", async () => {
    const id = await saved();
    expect(
      await updateLog(t.db, ana, id, input({ date: "2026-10-01" })),
    ).toEqual({ status: "needsMood" });
    const result = await updateLog(
      t.db,
      ana,
      id,
      input({ date: "2026-10-01", mood: 2 }),
    );
    expect(result.status).toBe("saved");
    expect((await getLog(t.db, ana, id))?.date).toBe("2026-10-01");
  });

  test("borrar el último registro conserva el día con su estado de ánimo y nota", async () => {
    const id = await saved();
    await t.db
      .update(practiceDays)
      .set({ note: "Cansado" })
      .where(eq(practiceDays.userId, ana));
    expect(await deleteLog(t.db, ana, id)).toBe(true);
    expect(await getLog(t.db, ana, id)).toBeNull();
    const days = await daysOf(ana);
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ mood: 4, note: "Cansado" });
  });

  test("un registro ajeno se comporta como inexistente", async () => {
    const id = await saved();
    expect(await getLog(t.db, bea, id)).toBeNull();
    expect(await updateLog(t.db, bea, id, input({ mood: 3 }))).toEqual({
      status: "notFound",
    });
    expect(await deleteLog(t.db, bea, id)).toBe(false);
    expect(await getLog(t.db, ana, id)).not.toBeNull();
  });
});
