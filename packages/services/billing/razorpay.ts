import Razorpay from "razorpay";
import crypto from "crypto";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export const PRO_PLAN_ID = process.env.RAZORPAY_PRO_PLAN_ID || "";

export async function createCustomer(email: string, name: string) {
  const customer = await razorpay.customers.create({
    email,
    name,
  });
  return customer.id;
}

export async function createSubscription(customerId: string, planId: string = PRO_PLAN_ID) {
  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_id: customerId,
    total_count: 12, // example total count for monthly
  } as any);
  return subscription;
}

export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(rawBody).digest("hex");
  return signature === digest;
}

export async function createOrder(amountInPaise: number, receipt: string, currency = "INR") {
  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency,
    receipt,
  });
  return order;
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${orderId}|${paymentId}`);
  const digest = hmac.digest("hex");
  return digest === signature;
}
