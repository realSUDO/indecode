import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@repo/services/billing/razorpay";
import { db } from "@repo/database";
import { users } from "@repo/database/models/user";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
    }

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === "subscription.charged") {
      const subscription = event.payload.subscription.entity;
      const customerId = subscription.customer_id;
      
      await db.update(users)
        .set({
          plan: "pro",
          subscriptionStatus: subscription.status,
          razorpaySubscriptionId: subscription.id,
          subscriptionRenewsAt: new Date(subscription.current_end * 1000)
        })
        .where(eq(users.razorpayCustomerId, customerId));
    }
    
    if (event.event === "subscription.halted" || event.event === "subscription.cancelled") {
      const subscription = event.payload.subscription.entity;
      const customerId = subscription.customer_id;
      
      await db.update(users)
        .set({
          plan: "free",
          subscriptionStatus: subscription.status,
        })
        .where(eq(users.razorpayCustomerId, customerId));
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
