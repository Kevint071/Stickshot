import { z } from "zod";
import type { PracticeSound, SoundKit } from "@/db/schema";

/*
 * Preferencias de sonido del usuario. Módulo sin dependencias de servidor: lo
 * usan las páginas, las actions y los componentes que suenan.
 */

export const SOUND_KITS = [
  "acoustic",
  "pad",
  "marching",
  "deep",
] as const satisfies readonly SoundKit[];

export const PRACTICE_SOUNDS = [
  "click",
  "pattern",
  "both",
] as const satisfies readonly PracticeSound[];

export const GHOST_VOLUME_MIN = 5;
export const GHOST_VOLUME_MAX = 60;

export type SoundSettings = {
  soundKit: SoundKit;
  /** Volumen de la ghost note en % del acento. */
  ghostVolume: number;
  practiceSound: PracticeSound;
};

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  soundKit: "acoustic",
  ghostVolume: 20,
  practiceSound: "click",
};

/** Cambio parcial: cada control guarda solo lo suyo. */
export const soundSettingsPatchSchema = z
  .object({
    soundKit: z.enum(SOUND_KITS),
    ghostVolume: z
      .number()
      .int()
      .min(GHOST_VOLUME_MIN, {
        error: `El volumen de la ghost va de ${GHOST_VOLUME_MIN} a ${GHOST_VOLUME_MAX} %`,
      })
      .max(GHOST_VOLUME_MAX, {
        error: `El volumen de la ghost va de ${GHOST_VOLUME_MIN} a ${GHOST_VOLUME_MAX} %`,
      }),
    practiceSound: z.enum(PRACTICE_SOUNDS),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    error: "Nada que guardar",
  });

export type SoundSettingsPatch = z.infer<typeof soundSettingsPatchSchema>;
