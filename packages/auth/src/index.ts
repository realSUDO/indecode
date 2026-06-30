import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@repo/database";
import * as schema from "@repo/database/schema";
import { nextCookies } from "better-auth/next-js";

const baseConfig = {
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user"
      },
      plan: {
        type: "string",
        required: false,
        defaultValue: "free"
      }
    }
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      mapProfileToUser: async (profile: any) => ({
        email: profile.email ?? `${profile.id}@users.noreply.github.com`,
        name: profile.name ?? profile.login,
      }),
    },
  },
  trustedOrigins: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")
    ? [
        `https://in.${process.env.NEXT_PUBLIC_APP_DOMAIN}`, 
        `https://payment.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
        `https://auth.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
        `https://sudo.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
        `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
      ]
    : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", process.env.NEXT_PUBLIC_APP_URL || ""],
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3003/api/auth",
  advanced: {
    cookiePrefix: "indecode",
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL?.includes("localhost"),
      domain: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")
        ? `.${process.env.NEXT_PUBLIC_APP_DOMAIN}` 
        : undefined,
    },
    useSecureCookies: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL?.includes("localhost"),
  },
} as const;

export const auth = betterAuth({
  ...baseConfig,
  plugins: [
    nextCookies(),
    {
      id: "debug-logger",
      hooks: {
        before: [{
          matcher: (context) => true,
          handler: async (context) => {
            console.log("[BetterAuth Hook] Received request for:", context.request?.url);
            return { context };
          }
        }]
      }
    }
  ],
});

export const expressAuth = betterAuth({
  ...baseConfig,
  plugins: [
    {
      id: "debug-logger",
      hooks: {
        before: [{
          matcher: (context) => true,
          handler: async (context) => {
            console.log("[BetterAuth Hook] Received request for:", context.request?.url);
            return { context };
          }
        }]
      }
    }
  ],
});

export type Auth = typeof auth;
