import { NextRequest, NextResponse } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";

export default async function middleware(request: NextRequest) {
  const { data: session } = await betterFetch<any>(
    "/api/auth/get-session",
    {
      baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3003",
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    },
  );

  if (!session) {
    return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3002/sign-in", request.url));
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== "admin") {
    // Redirect non-admins out of the admin panel
    return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
