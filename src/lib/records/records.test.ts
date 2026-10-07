import { describe, expect, test } from "vitest";
import {
  availableTiers,
  computeBrokenRecords,
  computeHistory,
  computeRecords,
  currentRecords,
  defaultTier,
  qualifyingTiers,
  type RecordLog,
  strokesPerMinute,
} from "./index";

let seq = 0;
/** Registro limpio de 1:00 a 140 semicorcheas (560 gpm) salvo que se indique otra cosa. */
function log(overrides: Partial<RecordLog> = {}): RecordLog {
  seq += 1;
  return {
    id: `log-${String(seq).padStart(4, "0")}`,
    exerciseId: "paradiddle",
    hand: "right",
    date: "2026-10-01",
    createdAt: new Date(Date.UTC(2026, 9, 1, 10, 0, seq)),
    durationSeconds: 60,
    bpm: 140,
    subdivision: "sixteenth",
    cleanliness: "clean",
    ...overrides,
  };
}

describe("strokesPerMinute", () => {
  test.each([
    ["quarter", 1],
    ["eighth", 2],
    ["triplet", 3],
    ["sixteenth", 4],
    ["sextuplet", 6],
    ["thirty_second", 8],
  ] as const)("%s son %i notas por pulso", (subdivision, notes) => {
    expect(strokesPerMinute(100, subdivision)).toBe(100 * notes);
  });

  test("140 en semicorcheas y 280 en corcheas son el mismo valor", () => {
    expect(strokesPerMinute(140, "sixteenth")).toBe(560);
    expect(strokesPerMinute(280, "eighth")).toBe(560);
  });
});

describe("qualifyingTiers", () => {
  test("menos de 15 s no cuenta para ningún tramo", () => {
    expect(qualifyingTiers(10)).toEqual([]);
    expect(qualifyingTiers(14)).toEqual([]);
  });

  test("1:20 cuenta para 15 s, 30 s y 1 min", () => {
    expect(qualifyingTiers(80)).toEqual([15, 30, 60]);
  });

  test("la duración exacta del tramo cuenta", () => {
    expect(qualifyingTiers(120)).toEqual([15, 30, 60, 120]);
    expect(qualifyingTiers(15)).toEqual([15]);
  });

  test("5 min o más cuenta para todos", () => {
    expect(qualifyingTiers(3599)).toEqual([15, 30, 60, 120, 180, 300]);
  });
});

describe("computeRecords", () => {
  const recordOf = (
    logs: RecordLog[],
    tier: number,
    hand: "right" | "left" = "right",
  ) =>
    computeRecords(logs).find(
      (r) =>
        r.exerciseId === "paradiddle" && r.hand === hand && r.tier === tier,
    )?.value;

  test("toma la mayor velocidad entre los registros que cuentan", () => {
    const logs = [log({ bpm: 120 }), log({ bpm: 150 }), log({ bpm: 130 })];
    expect(recordOf(logs, 60)).toBe(600);
  });

  test("un registro sucio no cuenta", () => {
    const logs = [log({ bpm: 120 }), log({ bpm: 200, cleanliness: "dirty" })];
    expect(recordOf(logs, 60)).toBe(480);
  });

  test("casi vale igual que limpio", () => {
    const logs = [log({ bpm: 120 }), log({ bpm: 150, cleanliness: "almost" })];
    expect(recordOf(logs, 60)).toBe(600);
  });

  test("un registro de menos de 15 s no genera récord", () => {
    expect(computeRecords([log({ durationSeconds: 10 })])).toEqual([]);
  });

  test("las manos llevan récords separados", () => {
    const logs = [log({ bpm: 140 }), log({ bpm: 150, hand: "left" })];
    expect(recordOf(logs, 60, "right")).toBe(560);
    expect(recordOf(logs, 60, "left")).toBe(600);
  });

  test("las series no suman duración", () => {
    const logs = [log({ durationSeconds: 60, sets: 3 } as Partial<RecordLog>)];
    expect(recordOf(logs, 60)).toBe(560);
    expect(recordOf(logs, 180)).toBeUndefined();
  });

  test("un registro cuenta para su tramo y los más cortos, no los largos", () => {
    const logs = [log({ durationSeconds: 80 })];
    expect(recordOf(logs, 15)).toBe(560);
    expect(recordOf(logs, 30)).toBe(560);
    expect(recordOf(logs, 60)).toBe(560);
    expect(recordOf(logs, 120)).toBeUndefined();
  });

  test("quitar el registro que sostenía el récord lo baja", () => {
    const top = log({ bpm: 160 });
    const rest = [log({ bpm: 120 }), log({ bpm: 130 })];
    expect(recordOf([...rest, top], 60)).toBe(640);
    expect(recordOf(rest, 60)).toBe(520);
    expect(recordOf([], 60)).toBeUndefined();
  });
});

describe("computeBrokenRecords", () => {
  test("la primera marca no es récord batido", () => {
    expect(computeBrokenRecords([log()])).toEqual([]);
  });

  test("igualar el récord no es récord batido", () => {
    const logs = [log({ bpm: 140 }), log({ bpm: 280, subdivision: "eighth" })];
    expect(computeBrokenRecords(logs)).toEqual([]);
  });

  test("un registro que supera varios tramos genera una novedad por tramo", () => {
    const logs = [
      log({ date: "2026-10-01", durationSeconds: 15, bpm: 140 }), // 560 en 15 s
      log({ date: "2026-10-01", durationSeconds: 30, bpm: 130 }), // 520 en 30 s
      log({ date: "2026-10-01", durationSeconds: 60, bpm: 125 }), // 500 en 1 min
      log({ date: "2026-10-02", durationSeconds: 65, bpm: 135 }), // 540
    ];
    const broken = computeBrokenRecords(logs);
    expect(broken.map((b) => [b.tier, b.value, b.previous])).toEqual([
      [30, 540, 520],
      [60, 540, 500],
    ]);
  });

  test("se ordenan del más reciente al más antiguo", () => {
    const logs = [
      log({ date: "2026-10-01", bpm: 120 }),
      log({ date: "2026-10-02", bpm: 130 }),
      log({ date: "2026-10-03", bpm: 140, durationSeconds: 15 }),
    ];
    const dates = computeBrokenRecords(logs)
      .filter((b) => b.tier === 15)
      .map((b) => b.date);
    expect(dates).toEqual(["2026-10-03", "2026-10-02"]);
  });

  test("dentro de una fecha se ordena por momento de creación", () => {
    const first = log({
      bpm: 120,
      createdAt: new Date("2026-10-01T09:00:00Z"),
    });
    const later = log({
      bpm: 130,
      createdAt: new Date("2026-10-01T18:00:00Z"),
    });
    // Llegan desordenados; el de la tarde bate al de la mañana.
    const broken = computeBrokenRecords([later, first]).filter(
      (b) => b.tier === 60,
    );
    expect(broken).toHaveLength(1);
    expect(broken[0]).toMatchObject({ logId: later.id, previous: 480 });
  });

  test("un registro en fecha pasada se evalúa en su posición cronológica", () => {
    const base = log({ date: "2026-09-28", bpm: 140 }); // 560
    const oct5 = log({ date: "2026-10-05", bpm: 145 }); // 580: batía a 560
    const before = computeBrokenRecords([base, oct5]).filter(
      (b) => b.tier === 60,
    );
    expect(before.map((b) => b.logId)).toEqual([oct5.id]);

    const oct1 = log({
      date: "2026-10-01",
      bpm: 150,
      createdAt: new Date("2026-10-07T12:00:00Z"), // anotado después
    }); // 600
    const after = computeBrokenRecords([base, oct5, oct1]).filter(
      (b) => b.tier === 60,
    );
    expect(after.map((b) => [b.logId, b.previous])).toEqual([[oct1.id, 560]]);
  });

  test("los sucios y los de menos de 15 s no baten ni cuentan como previo", () => {
    const logs = [
      log({ bpm: 120 }),
      log({ bpm: 200, cleanliness: "dirty" }),
      log({ bpm: 200, durationSeconds: 10 }),
      log({ bpm: 125 }),
    ];
    const broken = computeBrokenRecords(logs).filter((b) => b.tier === 60);
    expect(broken.map((b) => [b.value, b.previous])).toEqual([[500, 480]]);
  });
});

describe("computeHistory", () => {
  test("da el récord vigente al final de cada fecha, por mano", () => {
    const logs = [
      log({ date: "2026-10-01", bpm: 120 }),
      log({ date: "2026-10-01", bpm: 125 }),
      log({ date: "2026-10-02", bpm: 110, hand: "left" }),
      log({ date: "2026-10-03", bpm: 118 }), // no mejora la derecha
      log({ date: "2026-10-04", bpm: 130 }),
    ];
    expect(computeHistory(logs, "paradiddle", 60)).toEqual([
      { date: "2026-10-01", right: 500 },
      { date: "2026-10-02", right: 500, left: 440 },
      { date: "2026-10-04", right: 520, left: 440 },
    ]);
  });

  test("ignora otros ejercicios y registros que no llegan al tramo", () => {
    const logs = [
      log({ exerciseId: "flam-tap", bpm: 200 }),
      log({ durationSeconds: 30, bpm: 200 }),
      log({ bpm: 120 }),
    ];
    expect(computeHistory(logs, "paradiddle", 60)).toEqual([
      { date: "2026-10-01", right: 480 },
    ]);
  });
});

describe("currentRecords", () => {
  test("récord actual por mano en un tramo", () => {
    const logs = [log({ bpm: 120 }), log({ bpm: 110, hand: "left" })];
    expect(currentRecords(logs, "paradiddle", 60)).toEqual({
      right: 480,
      left: 440,
    });
  });
});

describe("availableTiers y defaultTier", () => {
  test("solo los tramos con algún registro que cuenta", () => {
    const logs = [
      log({ durationSeconds: 70 }),
      log({ durationSeconds: 400, cleanliness: "dirty" }),
    ];
    expect(availableTiers(logs, "paradiddle")).toEqual([15, 30, 60]);
  });

  test("por defecto 1 min si tiene datos", () => {
    expect(defaultTier([15, 30, 60])).toBe(60);
  });

  test("sin 1 min, el tramo con datos más cercano", () => {
    expect(defaultTier([15, 30])).toBe(30);
    expect(defaultTier([15])).toBe(15);
    expect(defaultTier([120, 300])).toBe(120);
  });

  test("sin datos no hay tramo", () => {
    expect(defaultTier([])).toBeUndefined();
  });
});
