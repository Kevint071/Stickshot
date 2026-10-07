import { describe, expect, test } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hash de contraseña", () => {
  test("no guarda la contraseña en claro", async () => {
    const hash = await hashPassword("tresillos-123");
    expect(hash).not.toContain("tresillos-123");
  });

  test("el mismo texto produce hashes distintos (sal aleatoria)", async () => {
    const a = await hashPassword("tresillos-123");
    const b = await hashPassword("tresillos-123");
    expect(a).not.toBe(b);
  });

  test("verifica la contraseña correcta", async () => {
    const hash = await hashPassword("tresillos-123");
    expect(await verifyPassword("tresillos-123", hash)).toBe(true);
  });

  test("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("tresillos-123");
    expect(await verifyPassword("tresillos-124", hash)).toBe(false);
  });

  test("rechaza un hash con formato desconocido", async () => {
    expect(await verifyPassword("x", "no-es-un-hash")).toBe(false);
  });
});
