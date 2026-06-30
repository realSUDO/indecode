import { router, protectedProcedure } from "../../trpc";
import { createCustomer, createSubscription, createOrder, verifyPaymentSignature } from "@repo/services/billing/razorpay";
import { z } from "zod";
import { db } from "@repo/database";
import { users } from "@repo/database/models/user";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const billingRouter = router({
  createSubscription: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      if (user.plan === "pro" && user.subscriptionStatus === "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already subscribed to Pro" });
      }

      let customerId = user.razorpayCustomerId;

      if (!customerId) {
        customerId = await createCustomer(user.email, user.name);
        await db.update(users).set({ razorpayCustomerId: customerId }).where(eq(users.id, user.id));
      }

      const subscription = await createSubscription(customerId);
      
      return {
        subscriptionId: subscription.id,
      };
    }),
  createOrder: protectedProcedure
    .input(z.object({
      amount: z.number().min(100),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const shortId = ctx.user.id.substring(0, 8);
        const receipt = `rcpt_${shortId}_${Date.now()}`.substring(0, 40);
        const order = await createOrder(input.amount, receipt);
        return {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
        };
      } catch (err) {
        console.error("[createOrder Error]:", err);
        throw err;
      }
    }),
  verifyPayment: protectedProcedure
    .input(z.object({
      orderId: z.string(),
      paymentId: z.string(),
      signature: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const isValid = verifyPaymentSignature(input.orderId, input.paymentId, input.signature);
      if (!isValid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid signature" });
      }

      await db.update(users).set({
        plan: "pro",
        subscriptionStatus: "active"
      }).where(eq(users.id, ctx.user.id));

      return { success: true };
    }),
});
