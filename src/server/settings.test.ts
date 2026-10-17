import { describe, expect, test } from "vitest";
import { practiceSoundEnum, soundKitEnum } from "@/db/schema";
import {
  DEFAULT_SOUND_SETTINGS,
  PRACTICE_SOUNDS,
  SOUND_KITS,
} from "@/lib/sound-settings";
import { createUser, setupTestDb } from "@/test/db";
import { getSoundSettings, saveSoundSettings } from "./settings";

const t = setupTestDb();

describe("preferencias de sonido", () => {
  test("las listas del cliente coinciden con los enums de la BD", () => {
    expect([...SOUND_KITS]).toEqual(soundKitEnum.enumValues);
    expect([...PRACTICE_SOUNDS]).toEqual(practiceSoundEnum.enumValues);
  });

  test("sin fila: caja acústica, ghost al 20 % y solo clic", async () => {
    const ana = await createUser(t.db, "ana@ejemplo.com");
    expect(await getSoundSettings(t.db, ana)).toEqual(DEFAULT_SOUND_SETTINGS);
    expect(DEFAULT_SOUND_SETTINGS).toEqual({
      soundKit: "acoustic",
      ghostVolume: 20,
      practiceSound: "click",
    });
  });

  test("guarda cambios parciales y conserva el resto", async () => {
    const ana = await createUser(t.db, "ana@ejemplo.com");
    await saveSoundSettings(t.db, ana, { soundKit: "pad" });
    await saveSoundSettings(t.db, ana, { ghostVolume: 35 });
    expect(await getSoundSettings(t.db, ana)).toEqual({
      soundKit: "pad",
      ghostVolume: 35,
      practiceSound: "click",
    });
  });

  test("cada usuario tiene las suyas", async () => {
    const ana = await createUser(t.db, "ana@ejemplo.com");
    const bea = await createUser(t.db, "bea@ejemplo.com");
    await saveSoundSettings(t.db, ana, { practiceSound: "both" });
    expect((await getSoundSettings(t.db, bea)).practiceSound).toBe("click");
  });

  test("sesión de una cuenta borrada: error controlado, sin lanzar", async () => {
    const result = await saveSoundSettings(
      t.db,
      "00000000-0000-4000-8000-000000000000",
      { practiceSound: "both" },
    );
    expect(result).toEqual({
      ok: false,
      error: "Tu cuenta ya no existe. Cierra sesión y vuelve a entrar.",
    });
  });

  test("rechaza volúmenes de ghost fuera de 5..60 y valores desconocidos", async () => {
    const ana = await createUser(t.db, "ana@ejemplo.com");
    for (const patch of [
      { ghostVolume: 4 },
      { ghostVolume: 61 },
      { soundKit: "cajón" },
      {},
    ]) {
      expect((await saveSoundSettings(t.db, ana, patch)).ok).toBe(false);
    }
    expect(await getSoundSettings(t.db, ana)).toEqual(DEFAULT_SOUND_SETTINGS);
  });
});
