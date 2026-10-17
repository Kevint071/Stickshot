import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { exerciseLogs, users } from "@/db/schema";
import type { Db } from "@/db/types";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  type SignInInput,
  type SignUpInput,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/account";

export type FieldErrors = Partial<Record<"email" | "password", string[]>>;

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; errors: FieldErrors };

export async function registerUser(
  db: Db,
  input: SignUpInput,
): Promise<RegisterResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { email, password } = parsed.data;
  const [created] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(password) })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  if (!created) {
    return {
      ok: false,
      errors: { email: ["Ya existe una cuenta con este correo"] },
    };
  }
  return { ok: true, userId: created.id };
}

// Hash de una contraseña cualquiera: se verifica contra él cuando el correo no
// existe, para que el tiempo de respuesta no revele qué correos tienen cuenta.
let dummyHash: Promise<string> | undefined;

export async function authenticateUser(
  db: Db,
  input: SignInInput,
): Promise<{ id: string; email: string } | null> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;
  const [user] = await db
    .select({ id: users.id, email: users.email, hash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user?.hash) {
    dummyHash ??= hashPassword("contraseña-de-relleno");
    await verifyPassword(password, await dummyHash);
    return null;
  }
  return (await verifyPassword(password, user.hash))
    ? { id: user.id, email: user.email }
    : null;
}

/** Ficha de la cuenta para Ajustes: alta y lo tocado desde entonces. */
export async function getAccountSummary(db: Db, userId: string) {
  const [[user], [totals]] = await Promise.all([
    db
      .select({ email: users.email, memberSince: users.createdAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({
        seconds: sql<number>`coalesce(sum(${exerciseLogs.durationSeconds} * ${exerciseLogs.sets}), 0)::int`,
        days: sql<number>`count(distinct ${exerciseLogs.dayId})::int`,
        logs: sql<number>`count(*)::int`,
        exercises: sql<number>`count(distinct ${exerciseLogs.exerciseId})::int`,
      })
      .from(exerciseLogs)
      .where(eq(exerciseLogs.userId, userId)),
  ]);
  // Sin fila (sesión de una cuenta ya borrada): totales a cero, sin datos de alta.
  return { email: user?.email, memberSince: user?.memberSince, ...totals };
}

export type AccountSummary = Awaited<ReturnType<typeof getAccountSummary>>;
