import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { isNull, sql } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { setupTestDb } from "@/test/db";
import { exercises } from "./schema";

const t = setupTestDb();

async function standardNames() {
  const rows = await t.db
    .select({ name: exercises.name })
    .from(exercises)
    .where(isNull(exercises.userId));
  return rows.map((r) => r.name);
}

describe("semilla de rudimentos", () => {
  test("las migraciones cargan los 40 rudimentos PAS", async () => {
    const names = await standardNames();
    expect(names).toHaveLength(40);
    expect(names).toContain("Single Stroke Roll");
    expect(names).toContain("Single Paradiddle");
    expect(names).toContain("Triple Ratamacue");
  });

  test("reejecutar la semilla no duplica", async () => {
    const dir = path.resolve(import.meta.dirname, "../../drizzle");
    const file = readdirSync(dir).find((f) =>
      f.endsWith("_seed-rudiments.sql"),
    );
    expect(file).toBeDefined();
    const seedSql = readFileSync(path.join(dir, file as string), "utf8");
    await t.db.execute(sql.raw(seedSql));
    expect(await standardNames()).toHaveLength(40);
  });
});
