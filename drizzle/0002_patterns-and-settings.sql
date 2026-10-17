CREATE TYPE "public"."practice_sound" AS ENUM('click', 'pattern', 'both');--> statement-breakpoint
CREATE TYPE "public"."sound_kit" AS ENUM('acoustic', 'pad', 'marching', 'deep');--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sound_kit" "sound_kit" DEFAULT 'acoustic' NOT NULL,
	"ghost_volume" smallint DEFAULT 20 NOT NULL,
	"practice_sound" "practice_sound" DEFAULT 'click' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_ghost_volume_range" CHECK ("user_settings"."ghost_volume" between 5 and 60)
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "pattern" jsonb;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;