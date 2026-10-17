import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";
import { exercises } from "@/db/schema";
import { notation, RUDIMENT_PATTERNS } from "@/lib/pattern/rudiments";
import { createUser, setupTestDb } from "@/test/db";
import {
  createCustomExercise,
  findVisibleExercise,
  listExercisesForPicker,
  saveExercisePattern,
} from "./exercises";
import { saveLog } from "./logs";

const t = setupTestDb();
let ana: string;
let bea: string;

beforeEach(async () => {
  ana = await createUser(t.db, "ana@ejemplo.com");
  bea = await createUser(t.db, "bea@ejemplo.com");
});

async function idOf(name: string, userId = ana) {
  const list = await listExercisesForPicker(t.db, userId);
  const found = list.find((e) => e.name === name);
  if (!found) throw new Error(`No existe ${name}`);
  return found.id;
}

async function practice(name: string, date: string) {
  const result = await saveLog(t.db, ana, {
    exerciseId: await idOf(name),
    date,
    hand: "right",
    bpm: 120,
    subdivision: "sixteenth",
    durationSeconds: 60,
    sets: 1,
    cleanliness: "clean",
    note: null,
    mood: 3,
  });
  expect(result.status).toBe("saved");
}

describe("listExercisesForPicker", () => {
  test("un usuario nuevo ve los 40 rudimentos en orden alfabético", async () => {
    const list = await listExercisesForPicker(t.db, ana);
    expect(list).toHaveLength(40);
    const names = list.map((e) => e.name);
    expect(names).toEqual(
      [...names].sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "base" }),
      ),
    );
  });

  test("los practicados van primero, del más reciente al más antiguo", async () => {
    await practice("Flam Tap", "2026-10-06");
    await practice("Single Paradiddle", "2026-10-07");
    const names = (await listExercisesForPicker(t.db, ana)).map((e) => e.name);
    expect(names.slice(0, 2)).toEqual(["Single Paradiddle", "Flam Tap"]);
    expect(names[2]).toBe("Double Drag Tap"); // el resto, alfabético
  });

  test("lo practicado por otro usuario no altera el orden", async () => {
    await practice("Flam Tap", "2026-10-06");
    const names = (await listExercisesForPicker(t.db, bea)).map((e) => e.name);
    expect(names[0]).toBe("Double Drag Tap");
  });

  test("incluye los ejercicios propios del usuario y no los de otros", async () => {
    await createCustomExercise(t.db, ana, "Singles mano izquierda sola");
    await createCustomExercise(t.db, bea, "Rutina de acentos");
    const names = (await listExercisesForPicker(t.db, ana)).map((e) => e.name);
    expect(names).toContain("Singles mano izquierda sola");
    expect(names).not.toContain("Rutina de acentos");
  });
});

describe("createCustomExercise", () => {
  test("crea un ejercicio propio con el nombre recortado", async () => {
    const result = await createCustomExercise(t.db, ana, "  Singles  ");
    expect(result).toMatchObject({ ok: true, exercise: { name: "Singles" } });
  });

  test("rechaza el nombre de un rudimento estándar sin distinguir mayúsculas", async () => {
    const result = await createCustomExercise(t.db, ana, "single paradiddle");
    expect(result).toEqual({
      ok: false,
      error: "Ya existe un ejercicio con ese nombre",
    });
  });

  test("rechaza un nombre propio repetido", async () => {
    await createCustomExercise(t.db, ana, "Singles");
    const result = await createCustomExercise(t.db, ana, "SINGLES");
    expect(result.ok).toBe(false);
  });

  test("dos usuarios pueden tener el mismo nombre", async () => {
    await createCustomExercise(t.db, bea, "Rutina de acentos");
    const result = await createCustomExercise(t.db, ana, "Rutina de acentos");
    expect(result.ok).toBe(true);
  });

  test("rechaza nombres vacíos o de más de 80 caracteres", async () => {
    expect((await createCustomExercise(t.db, ana, "   ")).ok).toBe(false);
    expect((await createCustomExercise(t.db, ana, "x".repeat(81))).ok).toBe(
      false,
    );
  });
});

describe("patrones", () => {
  const example = notation("sixteenth", "R R> L L>");

  test("los 40 rudimentos estándar tienen su patrón tras las migraciones", async () => {
    const list = await listExercisesForPicker(t.db, ana);
    const standard = list.filter((e) => !e.custom);
    expect(standard).toHaveLength(40);
    for (const exercise of standard) {
      expect(exercise.pattern, exercise.name).toEqual(
        RUDIMENT_PATTERNS[exercise.name],
      );
    }
  });

  test("un patrón corrupto en la BD se lee como sin patrón", async () => {
    const created = await createCustomExercise(t.db, ana, "Roto");
    if (!created.ok) throw new Error(created.error);
    await t.db
      .update(exercises)
      .set({ pattern: { steps: "RLRR" } })
      .where(eq(exercises.id, created.exercise.id));
    const found = await findVisibleExercise(t.db, ana, created.exercise.id);
    expect(found).toMatchObject({ custom: true, pattern: null });
  });

  test("el dueño guarda el patrón de su ejercicio y se lee igual", async () => {
    const created = await createCustomExercise(t.db, ana, "Acentos dobles");
    if (!created.ok) throw new Error(created.error);
    expect(created.exercise.pattern).toBeNull();
    const result = await saveExercisePattern(
      t.db,
      ana,
      created.exercise.id,
      example,
    );
    expect(result).toEqual({ ok: true, pattern: example });
    const found = await findVisibleExercise(t.db, ana, created.exercise.id);
    expect(found?.pattern).toEqual(example);
  });

  test("no se puede guardar en un ejercicio ajeno ni en un estándar", async () => {
    const created = await createCustomExercise(t.db, bea, "De Bea");
    if (!created.ok) throw new Error(created.error);
    expect(
      await saveExercisePattern(t.db, ana, created.exercise.id, example),
    ).toEqual({ ok: false, notFound: true });
    const paradiddle = await idOf("Single Paradiddle");
    expect(await saveExercisePattern(t.db, ana, paradiddle, example)).toEqual({
      ok: false,
      notFound: true,
    });
    const found = await findVisibleExercise(t.db, ana, paradiddle);
    expect(found?.pattern).toEqual(RUDIMENT_PATTERNS["Single Paradiddle"]);
  });

  test("rechaza un patrón inválido", async () => {
    const created = await createCustomExercise(t.db, ana, "Vacío");
    if (!created.ok) throw new Error(created.error);
    const result = await saveExercisePattern(t.db, ana, created.exercise.id, {
      subdivision: "sixteenth",
      steps: [],
    });
    expect(result).toEqual({
      ok: false,
      error: "El patrón necesita al menos un golpe",
    });
  });
});
