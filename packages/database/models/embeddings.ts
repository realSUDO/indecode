import { pgTable, text, varchar, timestamp, index, vector } from "drizzle-orm/pg-core";
import { repositories } from "./repository";

export const codebaseEmbeddings = pgTable("codebase_embeddings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  repositoryId: text("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  content: text("content").notNull(), // The chunk text
  embedding: vector("embedding", { dimensions: 1536 }).notNull(), // Assuming OpenRouter uses openai/text-embedding-3-small or similar
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  index("repo_file_idx").on(table.repositoryId, table.filePath),
]);
