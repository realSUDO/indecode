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
    
    // Process only payment.captured or subscription.charged for now
    if (event.event === "payment.captured" || event.event === "subscription.charged") {
      // Razorpay entity might have email or contact in payload depending on what was collected
      const email = event.payload?.payment?.entity?.email;
      
      if (email) {
        const user = await db.query.users.findFirst({
          where: eq(users.email, email)
        });

        if (user) {
          await db.update(users).set({
            plan: "pro",
            subscriptionStatus: "active"
          }).where(eq(users.id, user.id));

          await db.insert(auditLogs).values({
            actorId: user.id,
            targetUserId: user.id,
            action: "webhook_plan_upgraded",
            metadata: { event: event.event, paymentId: event.payload.payment.entity.id }
          });

          await invalidateCache(`user:profile:${user.id}`);
        }
      }
    }
    
    res.status(200).send("Webhook received");
  } catch (err) {
    logger.error("Error processing webhook:", err);
    res.status(500).send("Webhook processing failed");
  }
});

app.use(express.json());

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
