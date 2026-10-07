CREATE TYPE "public"."cleanliness" AS ENUM('dirty', 'almost', 'clean');--> statement-breakpoint
CREATE TYPE "public"."hand" AS ENUM('right', 'left');--> statement-breakpoint
CREATE TYPE "public"."subdivision" AS ENUM('quarter', 'eighth', 'triplet', 'sixteenth', 'sextuplet', 'thirty_second');--> statement-breakpoint
CREATE TABLE "exercise_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"hand" "hand" NOT NULL,
	"bpm" integer NOT NULL,
	"subdivision" "subdivision" NOT NULL,
	"duration_seconds" integer NOT NULL,
	"sets" integer DEFAULT 1 NOT NULL,
	"cleanliness" "cleanliness" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_logs_bpm_range" CHECK ("exercise_logs"."bpm" between 20 and 400),
	CONSTRAINT "exercise_logs_duration_range" CHECK ("exercise_logs"."duration_seconds" between 1 and 3599),
	CONSTRAINT "exercise_logs_sets_range" CHECK ("exercise_logs"."sets" between 1 and 99)
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"normalized_name" text GENERATED ALWAYS AS (lower(btrim(name))) STORED NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_owner_name_unique" UNIQUE NULLS NOT DISTINCT("user_id","normalized_name"),
	CONSTRAINT "exercises_name_length" CHECK (char_length(btrim("exercises"."name")) between 1 and 80)
);
--> statement-breakpoint
CREATE TABLE "practice_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"mood" smallint NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_days_user_date_unique" UNIQUE("user_id","date"),
	CONSTRAINT "practice_days_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "practice_days_mood_range" CHECK ("practice_days"."mood" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_lowercase" CHECK ("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_day_user_fk" FOREIGN KEY ("day_id","user_id") REFERENCES "public"."practice_days"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_days" ADD CONSTRAINT "practice_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_logs_user_exercise_hand_idx" ON "exercise_logs" USING btree ("user_id","exercise_id","hand");--> statement-breakpoint
CREATE INDEX "exercise_logs_day_idx" ON "exercise_logs" USING btree ("day_id");