import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { users } from "@/db/schema";
import { createUser, setupTestDb } from "@/test/db";
import { authenticateUser, getAccountSummary, registerUser } from "./accounts";
import { listExercisesForPicker } from "./exercises";
import { type SaveLogInput, saveLog } from "./logs";

const t = setupTestDb();

describe("registerUser", () => {
  test("crea la cuenta con el correo normalizado en minúsculas", async () => {
    const result = await registerUser(t.db, {
      email: "  Ana@Ejemplo.com ",
      password: "tresillos",
    });
    expect(result.ok).toBe(true);
    const rows = await t.db
      .select()
      .from(users)
      .where(eq(users.email, "ana@ejemplo.com"));
    expect(rows).toHaveLength(1);
    expect(rows[0].passwordHash).not.toContain("tresillos");
  });

  test("rechaza un correo ya registrado sin distinguir mayúsculas", async () => {
    await registerUser(t.db, {
      email: "ana@ejemplo.com",
      password: "tresillos",
    });
    const result = await registerUser(t.db, {
      email: "ANA@ejemplo.com",
      password: "otra-clave",
    });
    expect(result).toEqual({
      ok: false,
      errors: { email: ["Ya existe una cuenta con este correo"] },
    });
  });

  test("rechaza una contraseña de menos de 8 caracteres", async () => {
    const result = await registerUser(t.db, {
      email: "ana@ejemplo.com",
      password: "corta",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.password).toBeDefined();
  });

  test("rechaza un correo con formato inválido", async () => {
    const result = await registerUser(t.db, {
      email: "ana-sin-arroba",
      password: "tresillos",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBeDefined();
  });
});

describe("authenticateUser", () => {
  test("devuelve el usuario con credenciales correctas", async () => {
    await registerUser(t.db, {
      email: "ana@ejemplo.com",
      password: "tresillos",
    });
    const user = await authenticateUser(t.db, {
      email: "Ana@ejemplo.com",
      password: "tresillos",
    });
    expect(user?.email).toBe("ana@ejemplo.com");
  });

  test("devuelve null con contraseña incorrecta o correo inexistente", async () => {
    await registerUser(t.db, {
      email: "ana@ejemplo.com",
      password: "tresillos",
    });
    expect(
      await authenticateUser(t.db, { email: "ana@ejemplo.com", password: "x" }),
    ).toBeNull();
    expect(
      await authenticateUser(t.db, {
        email: "nadie@ejemplo.com",
        password: "tresillos",
      }),
    ).toBeNull();
  });
});

describe("getAccountSummary", () => {
  async function practice(userId: string, overrides: Partial<SaveLogInput>) {
    const list = await listExercisesForPicker(t.db, userId);
    const result = await saveLog(t.db, userId, {
      exerciseId: list[0].id,
      date: "2026-10-15",
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
  }

  test("cuenta vacía: fecha de alta y totales a cero", async () => {
    const ana = await createUser(t.db, "ana@ejemplo.com");
    const summary = await getAccountSummary(t.db, ana);
    expect(summary).toMatchObject({
      email: "ana@ejemplo.com",
      seconds: 0,
      days: 0,
      logs: 0,
      exercises: 0,
    });
    expect(summary?.memberSince).toBeInstanceOf(Date);
  });

  test("suma tiempo, días, registros y ejercicios distintos, solo del usuario", async () => {
    const ana = await createUser(t.db, "ana@ejemplo.com");
    const bea = await createUser(t.db, "bea@ejemplo.com");
    const [first, second] = await listExercisesForPicker(t.db, ana);
    await practice(ana, { exerciseId: first.id, sets: 3 });
    await practice(ana, { exerciseId: second.id, durationSeconds: 30 });
    await practice(ana, { exerciseId: first.id, date: "2026-10-16" });
    await practice(bea, {});
    expect(await getAccountSummary(t.db, ana)).toMatchObject({
      seconds: 60 * 3 + 30 + 60,
      days: 2,
      logs: 3,
      exercises: 2,
    });
  });

  test("usuario inexistente: sin correo ni alta y totales a cero", async () => {
    expect(
      await getAccountSummary(t.db, "00000000-0000-4000-8000-000000000000"),
    ).toEqual({
      email: undefined,
      memberSince: undefined,
      seconds: 0,
      days: 0,
      logs: 0,
      exercises: 0,
    });
  });
});
