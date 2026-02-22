ALTER TABLE "conversation_messages" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "is_main" boolean DEFAULT false NOT NULL;