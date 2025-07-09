CREATE TABLE "tokens" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tokens_id_idx" ON "tokens" USING btree ("id");--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "users" USING btree ("id");