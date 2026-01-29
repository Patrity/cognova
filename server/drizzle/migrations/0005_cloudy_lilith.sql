CREATE TABLE "cron_agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"status" text NOT NULL,
	"output" text,
	"error" text,
	"cost_usd" real,
	"input_tokens" integer,
	"output_tokens" integer,
	"num_turns" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "cron_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"schedule" text NOT NULL,
	"prompt" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"max_turns" integer DEFAULT 50,
	"max_budget_usd" real,
	"last_run_at" timestamp with time zone,
	"last_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
ALTER TABLE "cron_agent_runs" ADD CONSTRAINT "cron_agent_runs_agent_id_cron_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."cron_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cron_agents" ADD CONSTRAINT "cron_agents_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;