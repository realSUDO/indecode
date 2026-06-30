import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  advanced: {
    cookiePrefix: "indecode",
  },
  baseURL: process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_APP_URL : undefined,
});
