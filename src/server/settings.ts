import { eq } from "drizzle-orm";
import { userSettings } from "@/db/schema";
import type { Db } from "@/db/types";
import {
  DEFAULT_SOUND_SETTINGS,
  type SoundSettings,
  soundSettingsPatchSchema,
} from "@/lib/sound-settings";

/** Preferencias de sonido; sin fila, los valores por defecto. */
export async function getSoundSettings(
  db: Db,
  userId: string,
): Promise<SoundSettings> {
  const [row] = await db
    .select({
      soundKit: userSettings.soundKit,
      ghostVolume: userSettings.ghostVolume,
      practiceSound: userSettings.practiceSound,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row ?? DEFAULT_SOUND_SETTINGS;
}

/** Postgres 23503: la fila apunta a un usuario que ya no existe. */
function isMissingUser(error: unknown) {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return cause?.code === "23503";
}

export type SaveSoundSettingsResult =
  | { ok: true; settings: SoundSettings }
  | { ok: false; error: string };

/** Guarda un cambio parcial (crea la fila la primera vez). */
export async function saveSoundSettings(
  db: Db,
  userId: string,
  input: unknown,
): Promise<SaveSoundSettingsResult> {
  const parsed = soundSettingsPatchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  try {
    const [saved] = await db
      .insert(userSettings)
      .values({ ...DEFAULT_SOUND_SETTINGS, ...parsed.data, userId })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { ...parsed.data, updatedAt: new Date() },
      })
      .returning({
        soundKit: userSettings.soundKit,
        ghostVolume: userSettings.ghostVolume,
        practiceSound: userSettings.practiceSound,
      });
    return { ok: true, settings: saved };
  } catch (error) {
    // Sesión de una cuenta borrada: el JWT sigue vivo pero el usuario no está.
    if (isMissingUser(error)) {
      return {
        ok: false,
        error: "Tu cuenta ya no existe. Cierra sesión y vuelve a entrar.",
      };
    }
    throw error;
  }
}
