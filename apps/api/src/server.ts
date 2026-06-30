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
