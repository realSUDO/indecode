"use client";

import { trpc } from "~/trpc/client";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading } = trpc.auth.getSession.useQuery();

  useEffect(() => {
    if (!isLoading && !session?.user) {
      const isDev = process.env.NODE_ENV !== "production";
      const signInUrl = isDev ? "http://localhost:3002/sign-in" : `https://auth.${process.env.NEXT_PUBLIC_APP_DOMAIN || "indecode.in"}/sign-in`;
      window.location.href = signInUrl;
    }
  }, [isLoading, session]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading session...</p>
      </div>
    );
  }

  if (!session?.user) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
