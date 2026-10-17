"use server";

import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import {
  type SaveSoundSettingsResult,
  saveSoundSettings,
} from "@/server/settings";

export async function saveSoundSettingsAction(
  patch: unknown,
): Promise<SaveSoundSettingsResult> {
  const { userId } = await verifySession();
  // Sin revalidar: los componentes ya aplican el cambio al momento y las
  // páginas lo leen de nuevo en la siguiente navegación (son dinámicas).
  return saveSoundSettings(getDb(), userId, patch);
}
