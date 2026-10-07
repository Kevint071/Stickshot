import { describe, expect, test } from "vitest";
import { logInputSchema } from "./log";

const NOW = new Date("2026-10-07T15:00:00Z");

const valid = {
  exerciseId: "8d0f4a6e-2b5c-4f1e-9a3d-7c6b5e4d3c2b",
  date: "2026-10-07",
  hand: "right",
  bpm: "140",
  subdivision: "sixteenth",
  durationMinutes: "1",
  durationSeconds: "20",
  sets: "3",
  cleanliness: "clean",
  note: "",
};

function parse(overrides: Record<string, unknown> = {}) {
  return logInputSchema(NOW).safeParse({ ...valid, ...overrides });
}

function errorsOf(overrides: Record<string, unknown>) {
  const result = parse(overrides);
  expect(result.success).toBe(false);
  return result.error?.issues.map((i) => i.path.join(".")) ?? [];
}

describe("logInputSchema", () => {
  test("acepta un registro válido y convierte la duración a segundos", () => {
    const result = parse();
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      bpm: 140,
      durationSeconds: 80,
      sets: 3,
      note: null,
    });
  });

  test("series por defecto 1", () => {
    expect(parse({ sets: undefined }).data?.sets).toBe(1);
  });

  test("BPM obligatorio y entre 20 y 400", () => {
    expect(errorsOf({ bpm: "" })).toContain("bpm");
    expect(errorsOf({ bpm: "0" })).toContain("bpm");
    expect(errorsOf({ bpm: "401" })).toContain("bpm");
    expect(errorsOf({ bpm: "140.5" })).toContain("bpm");
  });

  test("segundos entre 0 y 59", () => {
    expect(errorsOf({ durationSeconds: "75" })).toContain("durationSeconds");
  });

  test("la duración debe ser mayor que 0:00", () => {
    expect(errorsOf({ durationMinutes: "0", durationSeconds: "0" })).toContain(
      "durationSeconds",
    );
  });

  test("la duración máxima es 59:59", () => {
    expect(
      parse({ durationMinutes: "59", durationSeconds: "59" }).success,
    ).toBe(true);
    expect(errorsOf({ durationMinutes: "60" })).toContain("durationMinutes");
  });

  test("minutos vacíos cuentan como 0", () => {
    expect(
      parse({ durationMinutes: "", durationSeconds: "45" }).data
        ?.durationSeconds,
    ).toBe(45);
  });

  test("series entre 1 y 99", () => {
    expect(errorsOf({ sets: "0" })).toContain("sets");
    expect(errorsOf({ sets: "100" })).toContain("sets");
  });

  test("mano, subdivisión y limpieza deben ser valores conocidos", () => {
    expect(errorsOf({ hand: "both" })).toContain("hand");
    expect(errorsOf({ subdivision: "quintuplet" })).toContain("subdivision");
    expect(errorsOf({ cleanliness: "perfecto" })).toContain("cleanliness");
  });

  test("la fecha no puede ser futura", () => {
    // Margen de un día sobre UTC para zonas horarias adelantadas.
    expect(parse({ date: "2026-10-08" }).success).toBe(true);
    expect(errorsOf({ date: "2026-10-09" })).toContain("date");
  });

  test("la fecha debe ser una fecha real", () => {
    expect(errorsOf({ date: "2026-02-30" })).toContain("date");
    expect(errorsOf({ date: "ayer" })).toContain("date");
  });

  test("la nota se recorta y vacía se guarda como null", () => {
    expect(parse({ note: "  rebotes  " }).data?.note).toBe("rebotes");
    expect(parse({ note: "   " }).data?.note).toBeNull();
  });

  test("el estado de ánimo es opcional y va de 1 a 5", () => {
    expect(parse({ mood: "4" }).data?.mood).toBe(4);
    expect(parse({ mood: undefined }).data?.mood).toBeUndefined();
    expect(errorsOf({ mood: "6" })).toContain("mood");
  });
});
