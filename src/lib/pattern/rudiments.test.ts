import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, describe as group, test } from "vitest";
import { describe, patternSchema } from ".";
import { notation, RUDIMENT_PATTERNS } from "./rudiments";

group("notation", () => {
  test("lee manos, fuerza, adornos y silencios", () => {
    expect(notation("eighth", "fR> l drL Rz -").steps).toEqual([
      { hand: "R", dynamic: "accent", ornament: "flam" },
      { hand: "L", dynamic: "ghost" },
      { hand: "L", dynamic: "normal", ornament: "drag" },
      { hand: "R", dynamic: "normal", ornament: "buzz" },
      null,
    ]);
  });

  test("rechaza golpes mal escritos", () => {
    expect(() => notation("eighth", "R X")).toThrow('Golpe no válido: "X"');
  });
});

group("RUDIMENT_PATTERNS", () => {
  test("cubre exactamente los 40 rudimentos sembrados", () => {
    const seed = readFileSync(
      path.resolve(
        import.meta.dirname,
        "../../../drizzle/0001_seed-rudiments.sql",
      ),
      "utf8",
    );
    const seeded = [...seed.matchAll(/\('([^']+)'\)/g)].map((m) => m[1]);
    expect(seeded).toHaveLength(40);
    expect(Object.keys(RUDIMENT_PATTERNS).sort()).toEqual(seeded.sort());
  });

  test("todos cumplen el esquema", () => {
    for (const [name, pattern] of Object.entries(RUDIMENT_PATTERNS)) {
      expect(patternSchema.safeParse(pattern).success, name).toBe(true);
    }
  });

  test("redobles: diddles en fusas y golpe final acentuado", () => {
    expect(describe(RUDIMENT_PATTERNS["Five Stroke Roll"])).toBe(
      "D D I I D> - - -  I I D D I> - - -",
    );
    expect(describe(RUDIMENT_PATTERNS["Nine Stroke Roll"])).toBe(
      "D D I I D D I I  D> - - - - - - -  I I D D I I D D  I> - - - - - - -",
    );
  });

  test("paradiddle y flam accent como en la hoja de la PAS", () => {
    expect(describe(RUDIMENT_PATTERNS["Single Paradiddle"])).toBe(
      "D> I D D  I> D I I",
    );
    expect(describe(RUDIMENT_PATTERNS["Flam Accent"])).toBe("fD> I D  fI> D I");
  });
});
