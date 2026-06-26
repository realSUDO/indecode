import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().describe("DB URL"),
});

function createEnv(env: NodeJS.ProcessEnv) {
  if (env.SKIP_ENV_VALIDATION === "1") {
    // Return dummy data during build to satisfy type checkers
    return { DATABASE_URL: "postgres://dummy:dummy@localhost:5432/dummy" };
  }
  
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
