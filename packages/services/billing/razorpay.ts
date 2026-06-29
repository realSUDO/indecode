import Razorpay from "razorpay";
import crypto from "crypto";

let razorpayInstance: Razorpay | null = null;
export function getRazorpay() {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn("Razorpay keys are missing. Razorpay will not function correctly.");
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "",
    });
  }
  return razorpayInstance;
}

export const PRO_PLAN_ID = process.env.RAZORPAY_PRO_PLAN_ID || "";

export async function createCustomer(email: string, name: string) {
  const customer = await getRazorpay().customers.create({
    email,
    name,
  });
  return customer.id;
}

export async function createSubscription(customerId: string, planId: string = PRO_PLAN_ID) {
  const subscription = await getRazorpay().subscriptions.create({
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
  const order = await getRazorpay().orders.create({
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
