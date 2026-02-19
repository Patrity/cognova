CREATE TABLE "skills_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"version" text NOT NULL,
	"author" text NOT NULL,
	"requires_secrets" text[] DEFAULT '{}',
	"files" text[] DEFAULT '{}',
	"updated_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_catalog_name_unique" UNIQUE("name")
);
