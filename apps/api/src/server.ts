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

if (env.NODE_ENV !== "prod") {
  app.use(
    cors({
      origin: "*",
    }),
  );
}

import { auth } from "@repo/auth";
import { toNodeHandler } from "better-auth/node";

const authHandler = toNodeHandler(auth);

// MUST be above express.json() because BetterAuth handles its own body parsing from the raw request stream
app.use((req, res, next) => {
  if (req.url.startsWith("/api/auth")) {
    authHandler(req, res).catch(next);
  } else {
    next();
  }
});

app.use(express.json());

app.get("/", (req, res) => {
  return res.json({ message: "Indecode is up and running..." });
});

app.get("/health", (req, res) => {
  return res.json({ message: "Indecode server is healthy", healthy: true });
});

app.get("/debug-env", (req, res) => {
  return res.json({
    githubClientId: process.env.GITHUB_CLIENT_ID,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
  });
});

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
app.get("/openapi.json", (req, res) => {
  return res.json(openApiDocument);
});

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiReference({ url: "/openapi.json" }));

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
