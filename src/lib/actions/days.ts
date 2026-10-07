"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { verifySession } from "@/lib/dal";
import { moodSchema } from "@/lib/validation/log";
import { updateDay } from "@/server/days";

const dayInputSchema = z.object({
  date: z.iso.date(),
  mood: moodSchema,
  note: z
    .string()
    .max(2000, { error: "La nota no puede superar 2000 caracteres" })
    .transform((value) => value.trim() || null),
});

export type UpdateDayResult =
  | { status: "saved" }
  | { status: "notFound" }
  | { status: "invalid"; error: string };

export async function updateDayAction(
  values: unknown,
): Promise<UpdateDayResult> {
  const { userId } = await verifySession();
  const parsed = dayInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "invalid", error: parsed.error.issues[0].message };
  }
  const { date, ...changes } = parsed.data;
  const updated = await updateDay(getDb(), userId, date, changes);
  if (!updated) return { status: "notFound" };
  revalidatePath("/historial", "layout");
  return { status: "saved" };
}
