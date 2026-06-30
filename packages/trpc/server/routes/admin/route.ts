import { router, protectedProcedure } from "../../trpc";
import { z } from "zod";
import { db } from "@repo/database";
import { users } from "@repo/database/models/user";
import { coupons } from "@repo/database/models/coupon";
import { auditLogs } from "@repo/database/models/audit-log";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { invalidateCache } from "@repo/services/cache";

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, ctx.user.id)
  });

  if (!user || user.role !== "admin") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin access required." });
  }

  return next({ ctx: { ...ctx, adminUser: user } });
});

export const adminRouter = router({
  getUsers: adminProcedure
    .query(async () => {
      const allUsers = await db.query.users.findMany({
        orderBy: [desc(users.createdAt)],
        limit: 100
      });
      return allUsers;
    }),

  grantPro: adminProcedure
    .input(z.object({
      targetUserId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, input.targetUserId)
      });
      
      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(users).set({
        plan: "pro",
        subscriptionStatus: "active"
      }).where(eq(users.id, input.targetUserId));

      await db.insert(auditLogs).values({
        actorId: ctx.adminUser.id,
        targetUserId: input.targetUserId,
        action: "manual_pro_grant",
        metadata: { previousPlan: targetUser.plan }
      });

      await invalidateCache(`user:profile:${input.targetUserId}`);

      return { success: true };
    }),

  getCoupons: adminProcedure
    .query(async () => {
      return await db.query.coupons.findMany({
        orderBy: [desc(coupons.createdAt)]
      });
    }),

  createCoupon: adminProcedure
    .input(z.object({
      code: z.string(),
      description: z.string().optional(),
      discountType: z.enum(["percentage", "fixed"]),
      discountValue: z.number(),
      maxUses: z.number().nullable().optional(),
      perUserLimit: z.number().default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const [newCoupon] = await db.insert(coupons).values({
        code: input.code,
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue,
        maxUses: input.maxUses || null,
        perUserLimit: input.perUserLimit,
      }).returning();

      await db.insert(auditLogs).values({
        actorId: ctx.adminUser.id,
        action: "coupon_created",
        metadata: { couponCode: newCoupon.code }
      });

      return newCoupon;
    })
});
