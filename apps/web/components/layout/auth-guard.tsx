"use client";

import { trpc } from "~/trpc/client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  if (process.env.NODE_ENV === "development") {
    // In dev, we might still want to check auth but we bypass it for some local routes.
    // However, to test onboarding locally, we should probably still run this check.
  }

  const { data: session, isLoading } = trpc.auth.getSession.useQuery();

  useEffect(() => {
    if (!isLoading) {
      if (!session?.user) {
        const isDev = process.env.NODE_ENV !== "production";
        const signInUrl = isDev ? "http://localhost:3002/sign-in" : `https://auth.${process.env.NEXT_PUBLIC_APP_DOMAIN || "indecode.in"}/sign-in`;
        window.location.href = signInUrl;
        return;
      }

      // Check onboarding
      if (session.user && !(session.user as any).onboardingCompleted) {
        if (!pathname?.startsWith("/onboarding")) {
          router.push("/onboarding");
        }
      } else if (session.user && (session.user as any).onboardingCompleted) {
        // If they finished onboarding but they are still on the onboarding page
        if (pathname?.startsWith("/onboarding")) {
          router.push("/dashboard");
        }
      }
    }
  }, [isLoading, session, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <p className="text-muted-foreground animate-pulse">Loading session...</p>
      </div>
    );
  }

  if (!session?.user) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
