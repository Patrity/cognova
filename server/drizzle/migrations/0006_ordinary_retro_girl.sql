CREATE TABLE "secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"encrypted_value" text NOT NULL,
	"iv" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "secrets_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;