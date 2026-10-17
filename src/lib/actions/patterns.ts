"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import {
  type SavePatternResult,
  saveExercisePattern,
} from "@/server/exercises";

export async function savePatternAction(
  exerciseId: string,
  pattern: unknown,
): Promise<SavePatternResult> {
  const { userId } = await verifySession();
  const result = await saveExercisePattern(
    getDb(),
    userId,
    exerciseId,
    pattern,
  );
  // El patrón se ve en la ficha, el selector de Practicar y el editor.
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
