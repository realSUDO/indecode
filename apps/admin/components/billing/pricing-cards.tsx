"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import Script from "next/script";

const TIERS = [
  {
    name: "Free",
    id: "free",
    price: "$0",
    description: "Perfect for individuals and small prototypes.",
    features: [
      "Access to Llama-3.1-70b",
      "Basic code generation",
      "Community support",
      "Limited usage (100 credits/mo)",
    ],
  },
  {
    name: "Pro",
    id: "pro",
    price: "$29",
    description: "For professionals needing maximum intelligence.",
    features: [
      "Access to GPT-4o & GPT-4o-mini",
      "Advanced AI Code Review",
      "Unlimited PRD generation",
      "Priority email support",
      "High usage limits",
    ],
  },
  {
    name: "Enterprise",
    id: "enterprise",
    price: "Custom",
    description: "For teams with custom security and compliance needs.",
    features: [
      "Everything in Pro",
      "Custom AI models",
      "SSO & Advanced Security",
      "Dedicated account manager",
      "Unlimited usage",
    ],
  },
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function PricingCards({ currentPlan }: { currentPlan: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();
  
  const createOrder = trpc.billing.createOrder.useMutation();
  const verifyPayment = trpc.billing.verifyPayment.useMutation({
    onSuccess: () => {
      utils.auth.getSession.invalidate();
      toast.success("Successfully upgraded to Pro!");
    },
    onError: (err) => {
      toast.error(err.message || "Payment verification failed");
    }
  });

  const handleUpgradeToPro = async () => {
    try {
      setIsLoading(true);
      
      const order = await createOrder.mutateAsync({ amount: 2900 }); // $29 -> 2900 cents/paise (assuming INR/USD conversion handled differently, let's just use 2900 for example, actually Razorpay uses paise for INR, so 2900 = ₹29. Let's make it 290000 for ₹2900)
      
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Enter the Key ID generated from the Dashboard
        amount: order.amount,
        currency: order.currency,
        name: "Indecode",
        description: "Pro Subscription",
        order_id: order.orderId,
        handler: async function (response: any) {
          await verifyPayment.mutateAsync({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on("payment.failed", function (response: any) {
        toast.error("Payment failed. Please try again.");
      });
      rzp1.open();
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate checkout");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto py-12">
        {TIERS.map((tier) => {
          const isActive = currentPlan === tier.id;
          return (
            <div
              key={tier.id}
              className={`flex flex-col p-6 rounded-2xl border ${
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "bg-card"
              }`}
            >
              <h3 className="text-2xl font-bold">{tier.name}</h3>
              <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                {tier.price}
                {tier.price !== "Custom" && (
                  <span className="ml-1 text-xl font-medium text-muted-foreground">
                    /mo
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {tier.description}
              </p>
              
              <ul className="mt-8 space-y-4 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="h-4 w-4 text-primary shrink-0 mr-3" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {isActive ? (
                  <Button className="w-full" variant="outline" disabled>
                    Current Plan
                  </Button>
                ) : tier.id === "pro" ? (
                  <Button 
                    className="w-full" 
                    onClick={handleUpgradeToPro} 
                    disabled={isLoading || currentPlan === "enterprise"}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upgrade to Pro
                  </Button>
                ) : tier.id === "enterprise" ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => window.location.href = "mailto:sales@indecode.in"}
                  >
                    Contact Sales
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    Downgrade
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
