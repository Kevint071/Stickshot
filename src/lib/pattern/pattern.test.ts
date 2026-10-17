import { expect, describe as group, test } from "vitest";
import {
  countLabel,
  describe,
  forLeadHand,
  MAX_STEPS,
  mirror,
  type Pattern,
  parsePattern,
  patternSchema,
  type Step,
  stepAt,
} from ".";

const R = (dynamic: "ghost" | "normal" | "accent" = "normal"): Step => ({
  hand: "R",
  dynamic,
});
const L = (dynamic: "ghost" | "normal" | "accent" = "normal"): Step => ({
  hand: "L",
  dynamic,
});

/** Paradiddle con acentos y ghost notes. */
const paradiddle: Pattern = {
  subdivision: "sixteenth",
  steps: [R("accent"), L("ghost"), R(), R(), L("accent"), R("ghost"), L(), L()],
};

group("patternSchema", () => {
  test("acepta el ejemplo del usuario: D normal, D acento, I normal, I acento", () => {
    const pattern = {
      subdivision: "sixteenth",
      steps: [R(), R("accent"), L(), L("accent")],
    };
    expect(patternSchema.safeParse(pattern).success).toBe(true);
  });

  test("acepta silencios y adornos", () => {
    const pattern = {
      subdivision: "triplet",
      steps: [
        { hand: "R", dynamic: "accent", ornament: "flam" },
        null,
        { hand: "L", dynamic: "normal", ornament: "drag" },
        { hand: "R", dynamic: "normal", ornament: "buzz" },
      ],
    };
    expect(patternSchema.safeParse(pattern).success).toBe(true);
  });

  test("rechaza patrones vacíos, solo silencios o con más de 64 pasos", () => {
    const base = { subdivision: "sixteenth" };
    expect(patternSchema.safeParse({ ...base, steps: [] }).success).toBe(false);
    expect(patternSchema.safeParse({ ...base, steps: [null] }).success).toBe(
      false,
    );
    const long = Array.from({ length: MAX_STEPS + 1 }, () => R());
    expect(patternSchema.safeParse({ ...base, steps: long }).success).toBe(
      false,
    );
  });

  test("rechaza manos, fuerzas, adornos o subdivisiones desconocidas", () => {
    for (const step of [
      { hand: "X", dynamic: "normal" },
      { hand: "R", dynamic: "fuerte" },
      { hand: "R", dynamic: "normal", ornament: "ruff" },
    ]) {
      expect(
        patternSchema.safeParse({ subdivision: "eighth", steps: [step] })
          .success,
      ).toBe(false);
    }
    expect(
      patternSchema.safeParse({ subdivision: "waltz", steps: [R()] }).success,
    ).toBe(false);
  });
});

group("parsePattern", () => {
  test("un patrón corrupto se trata como sin patrón", () => {
    expect(parsePattern({ steps: "RLRR" })).toBeNull();
    expect(parsePattern(null)).toBeNull();
    expect(parsePattern(paradiddle)).toEqual(paradiddle);
  });
});

group("mirror", () => {
  test("intercambia las manos y conserva fuerza, adorno y silencios", () => {
    const pattern: Pattern = {
      subdivision: "eighth",
      steps: [{ hand: "R", dynamic: "accent", ornament: "flam" }, null, L()],
    };
    expect(mirror(pattern).steps).toEqual([
      { hand: "L", dynamic: "accent", ornament: "flam" },
      null,
      R(),
    ]);
  });

  test("forLeadHand solo invierte si la mano inicial es la izquierda", () => {
    expect(forLeadHand(paradiddle, "R")).toBe(paradiddle);
    expect(describe(forLeadHand(paradiddle, "L"))).toBe("I> d I I  D> i D D");
  });
});

group("describe", () => {
  test("agrupa por pulsos de la subdivisión natural", () => {
    expect(describe(paradiddle)).toBe("D> i D D  I> d I I");
  });

  test("marca adornos y silencios", () => {
    const pattern: Pattern = {
      subdivision: "triplet",
      steps: [
        { hand: "R", dynamic: "accent", ornament: "flam" },
        { hand: "L", dynamic: "normal", ornament: "drag" },
        { hand: "R", dynamic: "normal", ornament: "buzz" },
        null,
      ],
    };
    expect(describe(pattern)).toBe("fD> drI Dz  -");
  });

  test("recorta con puntos suspensivos", () => {
    expect(describe(paradiddle, 4)).toBe("D> i D D …");
  });
});

group("stepAt", () => {
  test("recorre el patrón en bucle", () => {
    expect([0, 1, 7, 8, 9, 17].map((tick) => stepAt(tick, 8))).toEqual([
      0, 1, 7, 0, 1, 1,
    ]);
  });
});

group("countLabel", () => {
  test("semicorcheas: 1 e & a 2 e & a…, y vuelve a 1 tras el cuarto pulso", () => {
    expect(Array.from({ length: 8 }, (_, i) => countLabel(i, 4))).toEqual([
      "1",
      "e",
      "&",
      "a",
      "2",
      "e",
      "&",
      "a",
    ]);
    expect(countLabel(16, 4)).toBe("1");
  });

  test("tresillos, negras y subdivisiones sin sílabas usuales", () => {
    expect([0, 1, 2, 3].map((i) => countLabel(i, 3))).toEqual([
      "1",
      "&",
      "a",
      "2",
    ]);
    expect([0, 1, 2].map((i) => countLabel(i, 1))).toEqual(["1", "2", "3"]);
    expect([0, 1, 6].map((i) => countLabel(i, 6))).toEqual(["1", "·", "2"]);
  });
});
