import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";

/**
 * Barrera de autorización: toda página, Server Action y consulta de datos la
 * invoca. Sin sesión válida redirige a /login, así que nunca devuelve sin userId.
 */
export const verifySession = cache(async (): Promise<{ userId: string }> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  return { userId };
});
