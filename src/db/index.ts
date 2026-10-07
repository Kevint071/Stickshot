import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import type { Db } from "./types";

let instance: Db | undefined;

/** Conexión perezosa: no se abre durante el build ni en módulos que no la usan. */
export function getDb(): Db {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta la variable de entorno DATABASE_URL");
    // prepare: false para funcionar tras el pooler en modo transacción (Neon/Supabase).
    const client = postgres(url, { prepare: false });
    instance = drizzle(client, { schema });
  }
  return instance;
}
