import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow();

// Forma compatible con el adapter de Auth.js (name, email, emailVerified, image)
// para poder añadir la tabla accounts cuando llegue el login con Google.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified", {
      withTimezone: true,
      mode: "date",
    }),
    image: text("image"),
    passwordHash: text("password_hash"),
    createdAt: createdAt(),
  },
  (t) => [check("users_email_lowercase", sql`${t.email} = lower(${t.email})`)],
);

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null = rudimento estándar, común a todos los usuarios.
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name")
      .notNull()
      .generatedAlwaysAs(sql`lower(btrim(name))`),
    // Patrón de golpes (src/lib/pattern). Se valida al escribir y al leer:
    // null o inválido = el ejercicio no tiene patrón.
    pattern: jsonb("pattern").$type<unknown>(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("exercises_owner_name_unique")
      .on(t.userId, t.normalizedName)
      .nullsNotDistinct(),
    check(
      "exercises_name_length",
      sql`char_length(btrim(${t.name})) between 1 and 80`,
    ),
  ],
);

export const practiceDays = pgTable(
  "practice_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    mood: smallint("mood").notNull(),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("practice_days_user_date_unique").on(t.userId, t.date),
    // Destino de la FK compuesta de exercise_logs: un registro solo puede
    // pertenecer a un día de su mismo usuario.
    unique("practice_days_id_user_unique").on(t.id, t.userId),
    check("practice_days_mood_range", sql`${t.mood} between 1 and 5`),
  ],
);

export const handEnum = pgEnum("hand", ["right", "left"]);

export const subdivisionEnum = pgEnum("subdivision", [
  "quarter",
  "eighth",
  "triplet",
  "sixteenth",
  "sextuplet",
  "thirty_second",
]);

export const cleanlinessEnum = pgEnum("cleanliness", [
  "dirty",
  "almost",
  "clean",
]);

export const exerciseLogs = pgTable(
  "exercise_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayId: uuid("day_id").notNull(),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id),
    hand: handEnum("hand").notNull(),
    bpm: integer("bpm").notNull(),
    subdivision: subdivisionEnum("subdivision").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    sets: integer("sets").notNull().default(1),
    cleanliness: cleanlinessEnum("cleanliness").notNull(),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "exercise_logs_day_user_fk",
      columns: [t.dayId, t.userId],
      foreignColumns: [practiceDays.id, practiceDays.userId],
    }),
    index("exercise_logs_user_exercise_hand_idx").on(
      t.userId,
      t.exerciseId,
      t.hand,
    ),
    index("exercise_logs_day_idx").on(t.dayId),
    check("exercise_logs_bpm_range", sql`${t.bpm} between 20 and 400`),
    check(
      "exercise_logs_duration_range",
      sql`${t.durationSeconds} between 1 and 3599`,
    ),
    check("exercise_logs_sets_range", sql`${t.sets} between 1 and 99`),
  ],
);

export type Hand = (typeof handEnum.enumValues)[number];
export type Subdivision = (typeof subdivisionEnum.enumValues)[number];
export type Cleanliness = (typeof cleanlinessEnum.enumValues)[number];

export const soundKitEnum = pgEnum("sound_kit", [
  "acoustic",
  "pad",
  "marching",
  "deep",
]);

export const practiceSoundEnum = pgEnum("practice_sound", [
  "click",
  "pattern",
  "both",
]);

// Preferencias de sonido, una fila por usuario. Sin fila valen los valores por
// defecto, así que no hace falta crearla al registrarse.
export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    soundKit: soundKitEnum("sound_kit").notNull().default("acoustic"),
    // Volumen de la ghost note en % del acento.
    ghostVolume: smallint("ghost_volume").notNull().default(20),
    practiceSound: practiceSoundEnum("practice_sound")
      .notNull()
      .default("click"),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "user_settings_ghost_volume_range",
      sql`${t.ghostVolume} between 5 and 60`,
    ),
  ],
);

export type SoundKit = (typeof soundKitEnum.enumValues)[number];
export type PracticeSound = (typeof practiceSoundEnum.enumValues)[number];
