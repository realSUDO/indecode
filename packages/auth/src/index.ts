import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@repo/database";
import * as schema from "@repo/database/schema";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      mapProfileToUser: async (profile) => ({
        email: profile.email ?? `${profile.id}@users.noreply.github.com`,
        name: profile.name ?? profile.login,
      }),
    },
  },
  trustedOrigins: process.env.NODE_ENV === "production" 
    ? [`https://in.${process.env.NEXT_PUBLIC_APP_DOMAIN}`, `https://payment.${process.env.NEXT_PUBLIC_APP_DOMAIN}`]
    : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
  baseURL: "http://localhost:3002/api/auth",
  plugins: [
    nextCookies(),
    {
      id: "debug-logger",
      hooks: {
        before: [{
          matcher: (context) => true,
          handler: async (context) => {
            console.log("[BetterAuth Hook] Received request for:", context.path);
            return { context };
          }
        }]
      }
    }
  ],
  advanced: {
    cookiePrefix: "indecode",
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === "production",
      domain: process.env.NODE_ENV === "production" ? `.${process.env.NEXT_PUBLIC_APP_DOMAIN}` : undefined,
    },
  },
});

export type Auth = typeof auth;
