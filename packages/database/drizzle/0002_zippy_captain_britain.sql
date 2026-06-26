CREATE TABLE "discovery_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"feature_request_id" text NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_sessions_feature_request_id_unique" UNIQUE("feature_request_id")
);
--> statement-breakpoint
ALTER TABLE "discovery_messages" ADD CONSTRAINT "discovery_messages_session_id_discovery_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."discovery_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_feature_request_id_feature_requests_id_fk" FOREIGN KEY ("feature_request_id") REFERENCES "public"."feature_requests"("id") ON DELETE cascade ON UPDATE no action;