"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import type { BrokenRecord } from "@/lib/records";
import { type LogInput, logInputSchema } from "@/lib/validation/log";
import {
  type CreateExerciseResult,
  createCustomExercise,
} from "@/server/exercises";
import {
  deleteLog,
  getLog,
  type SaveLogResult,
  saveLog,
  updateLog,
} from "@/server/logs";
import { getBrokenRecordsForLog } from "@/server/progress";

export type SavedRecord = Pick<
  BrokenRecord,
  "hand" | "tier" | "value" | "previous"
>;

export type LogActionResult =
  | { status: "saved"; date: string; records: SavedRecord[] }
  | { status: "needsMood" }
  | { status: "notFound" }
  | { status: "invalid"; errors: Partial<Record<string, string[]>> };

function revalidateAll() {
  // Inicio, historial y gráficas dependen de los registros.
  revalidatePath("/", "layout");
}

async function persist(
  values: unknown,
  write: (userId: string, input: LogInput) => Promise<SaveLogResult>,
): Promise<LogActionResult> {
  const { userId } = await verifySession();
  const parsed = logInputSchema().safeParse(values);
  if (!parsed.success) {
    return {
      status: "invalid",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const result = await write(userId, parsed.data);
  if (result.status === "saved") {
    revalidateAll();
    const broken = await getBrokenRecordsForLog(
      getDb(),
      userId,
      parsed.data.exerciseId,
      result.logId,
    );
    return {
      status: "saved",
      date: result.date,
      records: broken.map(({ hand, tier, value, previous }) => ({
        hand,
        tier,
        value,
        previous,
      })),
    };
  }
  return result;
}

export async function saveLogAction(values: unknown) {
  return persist(values, (userId, input) => saveLog(getDb(), userId, input));
}

export async function updateLogAction(logId: string, values: unknown) {
  return persist(values, (userId, input) =>
    updateLog(getDb(), userId, logId, input),
  );
}

export async function deleteLogAction(logId: string) {
  const { userId } = await verifySession();
  const log = await getLog(getDb(), userId, logId);
  // Ya borrado (p. ej. doble toque) o ajeno: no hay nada que hacer allí.
  if (!log) redirect("/historial");
  await deleteLog(getDb(), userId, logId);
  revalidateAll();
  redirect(`/historial/${log.date}`);
}

export async function createExerciseAction(
  name: string,
): Promise<CreateExerciseResult> {
  const { userId } = await verifySession();
  const result = await createCustomExercise(getDb(), userId, name);
  if (result.ok) revalidateAll();
  return result;
}
