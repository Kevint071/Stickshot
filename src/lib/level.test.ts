import { describe, expect, test } from "vitest";
import { TEMPO_LEVELS, tempoLevel } from "./level";

const HOUR = 3600;

describe("tempoLevel", () => {
  test("sin práctica empieza en Largo, con la aguja a cero", () => {
    expect(tempoLevel(0)).toEqual({
      index: 0,
      name: "Largo",
      progress: 0,
      position: 0,
      next: { name: "Adagio", hours: 2 },
    });
  });

  test("el umbral exacto ya cuenta para el nivel siguiente", () => {
    expect(tempoLevel(2 * HOUR).name).toBe("Adagio");
    expect(tempoLevel(2 * HOUR - 1).name).toBe("Largo");
  });

  test("avance proporcional dentro del nivel", () => {
    const level = tempoLevel(6 * HOUR);
    expect(level.name).toBe("Adagio");
    expect(level.progress).toBeCloseTo(0.5);
    expect(level.position).toBeCloseTo(1.5 / TEMPO_LEVELS.length);
  });

  test("Presto es el último: progreso completo y sin siguiente", () => {
    const level = tempoLevel(500 * HOUR);
    expect(level).toMatchObject({ name: "Presto", progress: 1, position: 1 });
    expect(level.next).toBeUndefined();
  });
});
