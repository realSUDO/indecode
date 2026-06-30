import express from "express";
import { logger } from "@repo/logger";
import cors from "cors";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";

import { env } from "./env";

export const app = express();
const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "Indecode OpenAPI",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

if (env.NODE_ENV !== "prod" && env.NODE_ENV !== "production") {
  app.use(
    cors({
      origin: "*",
    }),
  );
} else {
  // Production CORS rules
  app.use(
    cors({
      origin: [
        "https://in.indecode.in",
        "https://www.indecode.in",
        "https://indecode.in",
        "https://payment.indecode.in",
        "https://auth.indecode.in"
      ],
      credentials: true,
    })
  );
}

// Auth is now handled by the dedicated auth.indecode.in Next.js application

import { verifyWebhookSignature } from "@repo/services/billing/razorpay";
import { db } from "@repo/database";
import { users } from "@repo/database/models/user";
import { auditLogs } from "@repo/database/models/audit-log";
import { eq } from "drizzle-orm";
import { invalidateCache } from "@repo/services/cache";

app.post("/api/webhooks/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"] as string;

  if (!secret || !signature) {
    return res.status(400).send("Webhook secret or signature missing");
  }

  const rawBody = req.body.toString("utf8");
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return res.status(400).send("Invalid signature");
  }

  try {
    const event = JSON.parse(rawBody);
    logger.info(`[Webhook] Received Razorpay Event: ${event.event}`, { eventId: event.id });
    
    // Process payment.captured, order.paid, or subscription.charged
    if (event.event === "payment.captured" || event.event === "order.paid" || event.event === "subscription.charged" || event.event === "payment.authorized") {
      const paymentEntity = event.payload?.payment?.entity;
      const email = paymentEntity?.email;
      
      if (email) {
        const user = await db.query.users.findFirst({
          where: eq(users.email, email)
        });

        if (user) {
          // If already pro, just log it. If not, upgrade.
          if (user.plan !== "pro") {
            await db.update(users).set({
              plan: "pro",
              subscriptionStatus: "active"
            }).where(eq(users.id, user.id));

            await db.insert(auditLogs).values({
              actorId: user.id,
              targetUserId: user.id,
              action: "webhook_plan_upgraded",
              metadata: { event: event.event, paymentId: paymentEntity.id }
            });

            await invalidateCache(`user:profile:${user.id}`);
            logger.info(`[Webhook] Upgraded user ${email} to Pro via event ${event.event}`);
          } else {
            logger.info(`[Webhook] User ${email} is already Pro, ignoring event ${event.event}`);
          }
        } else {
          logger.warn(`[Webhook] Received payment for unknown email: ${email}`);
        }
      } else {
        logger.warn(`[Webhook] No email found in payload for event ${event.event}`);
      }
    } else if (event.event === "payment.failed") {
      logger.warn(`[Webhook] Payment Failed Event Received: ${event.payload?.payment?.entity?.id}. Reason: ${event.payload?.payment?.entity?.error_description}`);
      // In the future, we could email the user here or mark the invoice as failed
    } else if (event.event === "subscription.cancelled" || event.event === "subscription.halted") {
      const email = event.payload?.subscription?.entity?.customer_notify ? event.payload?.subscription?.entity?.email : undefined; // Try to extract if available or from customer fetch
      // Currently, we don't have the customer email directly in the subscription payload sometimes, but if we log the event we can track it.
      logger.info(`[Webhook] Subscription Cancelled/Halted: ${event.payload?.subscription?.entity?.id}`);
    }
    
    res.status(200).send("Webhook received and processed");
  } catch (err) {
    logger.error("[Webhook Error]: Error processing webhook:", err);
    res.status(500).send("Webhook processing failed");
  }
});

app.use(express.json());

import { getIO } from "./socket";

// Internal endpoint to emit socket events from Next.js / Inngest
app.post("/api/internal/emit", (req, res) => {
  // In production, you'd protect this with a shared internal secret
  const { event, featureId, data } = req.body;
  if (!event || !featureId) {
    return res.status(400).json({ error: "Missing event or featureId" });
  }
  
  try {
    const io = getIO();
    io.to(featureId).emit(event, data);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Socket.io not initialized" });
  }
});

app.get("/", (req, res) => {
  return res.json({ message: "Indecode is up and running..." });
});

app.get("/health", (req, res) => {
  return res.json({ message: "Indecode server is healthy", healthy: true });
});

if (env.NODE_ENV !== "prod" && env.NODE_ENV !== "production") {
  logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
  app.get("/openapi.json", (req, res) => {
    return res.json(openApiDocument);
  });

  logger.debug(`docs: ${env.BASE_URL}/docs`);
  app.use("/docs", apiReference({ url: "/openapi.json" }));
}

app.use(
  "/api",
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

export default app;
