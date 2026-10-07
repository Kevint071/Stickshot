import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/** Base de datos común a postgres.js (producción) y PGlite (tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
