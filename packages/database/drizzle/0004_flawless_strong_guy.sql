CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE "codebase_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"repository_id" text NOT NULL,
	"file_path" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "codebase_embeddings" ADD CONSTRAINT "codebase_embeddings_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "embedding_idx" ON "codebase_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "repo_file_idx" ON "codebase_embeddings" USING btree ("repository_id","file_path");