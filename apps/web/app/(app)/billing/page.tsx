"use client";

import { PricingCards } from "~/components/billing/pricing-cards";
import { trpc } from "~/trpc/client";
import { CreditCard } from "lucide-react";

export default function BillingPage() {
  const { data: session, isLoading } = trpc.auth.getSession.useQuery();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading billing details...</p>
      </div>
    );
  }

  const currentPlan = session?.user?.plan || "free";

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-primary" />
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription plan, billing history, and AI usage limits.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 mb-12 flex flex-col md:flex-row items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Current Plan: <span className="text-primary capitalize">{currentPlan}</span></h2>
          <p className="text-sm text-muted-foreground">
            {currentPlan === "free" 
              ? "You are currently on the free tier with limited AI credits."
              : "You have full access to our premium AI models and features."}
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          {currentPlan === "free" && (
            <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              Upgrade to unlock GPT-4o
            </div>
          )}
        </div>
      </div>

      <PricingCards currentPlan={currentPlan} />
    </div>
  );
}
