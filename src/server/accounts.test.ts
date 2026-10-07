import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { users } from "@/db/schema";
import { setupTestDb } from "@/test/db";
import { authenticateUser, registerUser } from "./accounts";

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
