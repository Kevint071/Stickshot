import { beforeEach, describe, expect, test } from "vitest";
import { createUser, setupTestDb } from "@/test/db";
import { exerciseLogs, exercises, practiceDays } from "./schema";

const t = setupTestDb();
let ana: string;
let bea: string;

beforeEach(async () => {
  ana = await createUser(t.db, "ana@ejemplo.com");
  bea = await createUser(t.db, "bea@ejemplo.com");
});

describe("practice_days", () => {
  test("solo admite un día por fecha y usuario", async () => {
    await t.db
      .insert(practiceDays)
      .values({ userId: ana, date: "2026-10-07", mood: 3 });
    await expect(
      t.db
        .insert(practiceDays)
        .values({ userId: ana, date: "2026-10-07", mood: 4 }),
    ).rejects.toThrow();
  });

  test("dos usuarios pueden tener día en la misma fecha", async () => {
    await t.db
      .insert(practiceDays)
      .values({ userId: ana, date: "2026-10-07", mood: 3 });
    await t.db
      .insert(practiceDays)
      .values({ userId: bea, date: "2026-10-07", mood: 3 });
  });

  test("la carita va de 1 a 5", async () => {
    await expect(
      t.db
        .insert(practiceDays)
        .values({ userId: ana, date: "2026-10-07", mood: 6 }),
    ).rejects.toThrow();
  });
});

describe("exercise_logs", () => {
  test("un registro no puede colgar del día de otro usuario", async () => {
    const [day] = await t.db
      .insert(practiceDays)
      .values({ userId: bea, date: "2026-10-07", mood: 3 })
      .returning();
    const [exercise] = await t.db
      .insert(exercises)
      .values({ userId: ana, name: "Singles" })
      .returning();
    await expect(
      t.db.insert(exerciseLogs).values({
        userId: ana,
        dayId: day.id,
        exerciseId: exercise.id,
        hand: "right",
        bpm: 120,
        subdivision: "sixteenth",
        durationSeconds: 60,
        cleanliness: "clean",
      }),
    ).rejects.toThrow();
  });
});

describe("exercises", () => {
  test("un usuario no repite nombre sin distinguir mayúsculas ni espacios", async () => {
    await t.db.insert(exercises).values({ userId: ana, name: "Singles" });
    await expect(
      t.db.insert(exercises).values({ userId: ana, name: "  singles " }),
    ).rejects.toThrow();
  });

  test("dos usuarios pueden usar el mismo nombre", async () => {
    await t.db.insert(exercises).values({ userId: ana, name: "Singles" });
    await t.db.insert(exercises).values({ userId: bea, name: "Singles" });
  });
});

describe("users", () => {
  test("el correo se guarda en minúsculas", async () => {
    await expect(createUser(t.db, "Carla@Ejemplo.com")).rejects.toThrow();
  });
});
