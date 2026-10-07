import { z } from "zod";
import { cleanlinessEnum, handEnum, subdivisionEnum } from "@/db/schema";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

function intField(min: number, max: number, message: string) {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: message })
      .int({ error: message })
      .min(min, { error: message })
      .max(max, { error: message }),
  );
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

/** Último día aceptable: hoy en UTC más un día de margen para zonas horarias adelantadas. */
export function latestAllowedDate(now: Date) {
  const limit = new Date(now);
  limit.setUTCDate(limit.getUTCDate() + 1);
  return limit.toISOString().slice(0, 10);
}

export function dateSchema(now: Date) {
  return z
    .string({ error: "Indica la fecha" })
    .regex(DATE_PATTERN, { error: "Fecha no válida" })
    .refine(isRealDate, { error: "Fecha no válida" })
    .refine((value) => value <= latestAllowedDate(now), {
      error: "La fecha no puede ser futura",
    });
}

export const moodSchema = intField(1, 5, "Indica tu estado de ánimo del día");

/** Valida el formulario de registro. `now` se inyecta para poder testear el límite de fecha. */
export function logInputSchema(now: Date = new Date()) {
  return z
    .object({
      exerciseId: z.uuid({ error: "Elige un ejercicio" }),
      date: dateSchema(now),
      hand: z.enum(handEnum.enumValues, { error: "Elige la mano inicial" }),
      bpm: intField(20, 400, "El BPM debe ser un entero entre 20 y 400"),
      subdivision: z.enum(subdivisionEnum.enumValues, {
        error: "Elige la subdivisión",
      }),
      durationMinutes: z.preprocess(
        (value) => emptyToUndefined(value) ?? 0,
        z.coerce
          .number({ error: "Minutos entre 0 y 59" })
          .int({ error: "Minutos entre 0 y 59" })
          .min(0, { error: "Minutos entre 0 y 59" })
          .max(59, { error: "Minutos entre 0 y 59" }),
      ),
      durationSeconds: z.preprocess(
        (value) => emptyToUndefined(value) ?? 0,
        z.coerce
          .number({ error: "Segundos entre 0 y 59" })
          .int({ error: "Segundos entre 0 y 59" })
          .min(0, { error: "Segundos entre 0 y 59" })
          .max(59, { error: "Segundos entre 0 y 59" }),
      ),
      sets: z.preprocess(
        (value) => emptyToUndefined(value) ?? 1,
        z.coerce
          .number({ error: "Series entre 1 y 99" })
          .int({ error: "Series entre 1 y 99" })
          .min(1, { error: "Series entre 1 y 99" })
          .max(99, { error: "Series entre 1 y 99" }),
      ),
      cleanliness: z.enum(cleanlinessEnum.enumValues, {
        error: "Indica la limpieza",
      }),
      note: z
        .string()
        .max(2000, { error: "La nota no puede superar 2000 caracteres" })
        .optional()
        .transform((value) => value?.trim() || null),
      mood: moodSchema.optional(),
    })
    .superRefine((value, ctx) => {
      if (value.durationMinutes * 60 + value.durationSeconds === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["durationSeconds"],
          message: "La duración debe ser mayor que 0:00",
        });
      }
    })
    .transform(({ durationMinutes, durationSeconds, ...rest }) => ({
      ...rest,
      durationSeconds: durationMinutes * 60 + durationSeconds,
    }));
}

export type LogInput = z.output<ReturnType<typeof logInputSchema>>;
export type LogFormValues = z.input<ReturnType<typeof logInputSchema>>;
