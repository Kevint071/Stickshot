import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach } from "vitest";
import * as schema from "@/db/schema";
import type { Db } from "@/db/types";

/** Postgres en memoria con las mismas migraciones que producción. */
export async function createTestDb(): Promise<{
  db: Db;
  close: () => Promise<void>;
}> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, {
    migrationsFolder: path.resolve(import.meta.dirname, "../../drizzle"),
  });
  return { db, close: () => client.close() };
}

/**
 * Una BD por archivo de test, vaciada antes de cada test. Borrar los usuarios
 * arrastra en cascada sus días, registros y ejercicios propios, y conserva los
 * rudimentos estándar que cargan las migraciones.
 */
export function setupTestDb() {
  const ref = {} as { db: Db };
  let close: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const created = await createTestDb();
    ref.db = created.db;
    close = created.close;
  });

  beforeEach(async () => {
    await ref.db.delete(schema.users);
  });

  afterAll(async () => {
    await close?.();
  });

  return ref;
}

export async function createUser(db: Db, email: string) {
  const [user] = await db
    .insert(schema.users)
    .values({ email })
    .returning({ id: schema.users.id });
  return user.id;
}
