import { describe, expect, test } from "vitest";
import {
  addDays,
  challengeStep,
  computeStreak,
  dateInZone,
  heatLevel,
  heatmap,
  secondsBetween,
  weekdayIndex,
} from "./index";

describe("addDays y weekdayIndex", () => {
  test("cruzan meses y años", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  test("la semana empieza en lunes", () => {
    expect(weekdayIndex("2026-10-12")).toBe(0); // lunes
    expect(weekdayIndex("2026-10-18")).toBe(6); // domingo
  });
});

describe("dateInZone", () => {
  const now = new Date("2026-10-17T02:30:00Z");

  test("usa el calendario de la zona", () => {
    expect(dateInZone(now, "America/Bogota")).toBe("2026-10-16");
    expect(dateInZone(now, "Europe/Madrid")).toBe("2026-10-17");
  });

  test("sin zona o con una inválida, UTC", () => {
    expect(dateInZone(now)).toBe("2026-10-17");
    expect(dateInZone(now, "No/Existe")).toBe("2026-10-17");
  });
});

describe("computeStreak", () => {
  test("cuenta hasta hoy", () => {
    const dates = ["2026-10-14", "2026-10-15", "2026-10-16"];
    expect(computeStreak(dates, "2026-10-16")).toEqual({ current: 3, best: 3 });
  });

  test("sigue viva si se practicó ayer", () => {
    expect(computeStreak(["2026-10-15"], "2026-10-16").current).toBe(1);
  });

  test("se rompe tras un día entero sin práctica", () => {
    expect(computeStreak(["2026-10-14"], "2026-10-16").current).toBe(0);
  });

  test("la mejor racha puede ser antigua y no repite fechas", () => {
    const dates = [
      "2026-09-01",
      "2026-09-02",
      "2026-09-02",
      "2026-09-03",
      "2026-10-16",
    ];
    expect(computeStreak(dates, "2026-10-16")).toEqual({ current: 1, best: 3 });
  });

  test("sin práctica", () => {
    expect(computeStreak([], "2026-10-16")).toEqual({ current: 0, best: 0 });
  });
});

describe("secondsBetween", () => {
  test("suma solo dentro del rango", () => {
    const days = [
      { date: "2026-10-09", seconds: 600, logs: 1 },
      { date: "2026-10-10", seconds: 300, logs: 1 },
      { date: "2026-10-16", seconds: 120, logs: 2 },
    ];
    expect(secondsBetween(days, "2026-10-10", "2026-10-16")).toBe(420);
  });
});

describe("heatLevel", () => {
  test("umbrales", () => {
    expect([0, 60, 299, 300, 899, 900, 1799, 1800].map(heatLevel)).toEqual([
      0, 1, 1, 2, 2, 3, 3, 4,
    ]);
  });
});

describe("heatmap", () => {
  test("columnas de lunes a domingo que acaban en la semana de hoy", () => {
    const grid = heatmap(
      [{ date: "2026-10-14", seconds: 1200, logs: 2 }],
      "2026-10-16",
      2,
    );
    expect(grid).toHaveLength(2);
    expect(grid[0][0].date).toBe("2026-10-05");
    expect(grid[1][6].date).toBe("2026-10-18");
    expect(grid[1][2]).toMatchObject({ date: "2026-10-14", level: 3 });
    expect(grid[1][4].future).toBe(false);
    expect(grid[1][5].future).toBe(true);
  });
});

describe("challengeStep", () => {
  test("un 3 % del tempo, mínimo 2", () => {
    expect(challengeStep(60)).toBe(2);
    expect(challengeStep(120)).toBe(4);
    expect(challengeStep(200)).toBe(6);
  });
});
