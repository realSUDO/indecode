import { z, zodUndefinedModel } from "../../schema";
import { userService } from "../../services";
import { getAuthenticationMethodOutputSchema } from "@repo/services/user/model";
import { publicProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");

export const authRouter = router({
  getSupportedAuthenticationProviders: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/supported-providers"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(z.readonly(z.array(getAuthenticationMethodOutputSchema)))
    .query(async () => {
      const supportedMethods = await userService.getAuthenticationMethods();
      return supportedMethods;
    }),
  getSession: protectedProcedure
    .query(async ({ ctx }) => {
      // Return the mock user we inject in trpc.ts, or null
      return { user: (ctx as any).user || null };
    }),
  completeOnboarding: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      company: z.string().optional(),
      onboardingRole: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = await import("@repo/database");
      const { users } = await import("@repo/database/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(users)
        .set({
          name: input.name,
          company: input.company,
          onboardingRole: input.onboardingRole,
          onboardingCompleted: true,
        })
        .where(eq(users.id, (ctx as any).user.id));

      return { success: true };
    }),
});
