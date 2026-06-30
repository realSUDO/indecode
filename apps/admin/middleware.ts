import { NextRequest, NextResponse } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";

export default async function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  
  const { data: session } = await betterFetch<any>(
    "/api/auth/get-session",
    {
      baseURL: isDev ? "http://localhost:3003" : "https://auth.indecode.in",
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    },
  );
  
  if (!session) {
    const authUrl = isDev ? "http://localhost:3002/sign-in" : "https://auth.indecode.in/sign-in";
    return NextResponse.redirect(new URL(authUrl, request.url));
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== "admin") {
    // Redirect non-admins out of the admin panel
    const appUrl = isDev ? "http://localhost:3003" : "https://in.indecode.in";
    return NextResponse.redirect(new URL(appUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
