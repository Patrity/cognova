CREATE TABLE "hook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"session_id" text,
	"project_dir" text,
	"tool_name" text,
	"tool_matcher" text,
	"event_data" text,
	"exit_code" integer,
	"blocked" boolean DEFAULT false NOT NULL,
	"block_reason" text,
	"duration_ms" integer,
	"hook_script" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
