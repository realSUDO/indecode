ALTER TABLE "users" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_role" varchar(100);