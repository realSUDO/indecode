import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().optional(),
  NODE_ENV: z.enum(["development", "prod", "production"]).default("development"),
  BASE_URL: z.string().default("http://localhost:8000"),
});

function createEnv(env: NodeJS.ProcessEnv) {
  if (!!env.SKIP_ENV_VALIDATION && env.SKIP_ENV_VALIDATION !== "0" && env.SKIP_ENV_VALIDATION !== "false") {
    return {} as any;
  }
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
