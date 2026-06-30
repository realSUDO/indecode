"use client";

import { trpc } from "~/trpc/client";
import { useState } from "react";
import Script from "next/script";

export default function BillingPage() {
  const { data: session, isLoading: sessionLoading } = trpc.auth.getSession.useQuery();
  const [loading, setLoading] = useState(false);
  
  const [couponCode, setCouponCode] = useState("");
  const [isCouponValidating, setIsCouponValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const isDev = process.env.NODE_ENV !== "production";
  const dashboardUrl = isDev ? "http://localhost:3002/dashboard" : `https://in.${process.env.NEXT_PUBLIC_APP_DOMAIN || "indecode.in"}/dashboard`;
  const signInUrl = isDev ? "http://localhost:3002/sign-in" : `https://in.${process.env.NEXT_PUBLIC_APP_DOMAIN || "indecode.in"}/sign-in`;

  const validateCoupon = trpc.billing.validateCoupon.useMutation({
    onSuccess: (data) => {
      setAppliedCoupon(data);
      alert(`Coupon applied! ${data.discountValue}${data.discountType === 'percentage' ? '%' : '₹'} OFF`);
    },
    onError: (err) => {
      setAppliedCoupon(null);
      alert(err.message || "Invalid coupon");
    }
  });

  const applyFullBypassCoupon = trpc.billing.applyFullBypassCoupon.useMutation({
    onSuccess: () => {
      alert("Successfully upgraded to Pro with 100% OFF Coupon!");
      window.location.href = dashboardUrl;
    },
    onError: (err) => {
      alert(err.message || "Failed to redeem coupon");
      setLoading(false);
    }
  });

  const verifyPayment = trpc.billing.verifyPayment.useMutation({
    onSuccess: () => {
      alert("Payment successful! The dashboard will update shortly.");
      window.location.href = dashboardUrl;
    },
    onError: (err) => {
      alert("Verification Error: " + err.message);
      setLoading(false);
    }
  });

  const createOrder = trpc.billing.createOrder.useMutation({
    onSuccess: (data) => {
      // Razorpay Checkout Integration
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: "Indecode",
        description: "Pro Subscription (One-Time)",
        handler: function (response: any) {
          verifyPayment.mutate({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };
      
      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any) {
        alert("Payment Failed: " + response.error.description);
        setLoading(false);
      });
      rzp1.open();
    },
    onError: (err) => {
      alert("Error: " + err.message);
      setLoading(false);
    }
  });

  if (sessionLoading) {
    return <div className="p-8 text-white">Loading session...</div>;
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="text-gray-400 mb-6">Please log in to manage your billing.</p>
        <a href={signInUrl} className="bg-indigo-600 px-6 py-2 rounded-lg font-medium hover:bg-indigo-700">Sign In</a>
      </div>
    );
  }

  const handleApplyCoupon = () => {
    if (!couponCode) return;
    setIsCouponValidating(true);
    validateCoupon.mutate({ code: couponCode }, {
      onSettled: () => setIsCouponValidating(false)
    });
  };

  const handleUpgrade = async () => {
    setLoading(true);

    if (appliedCoupon && appliedCoupon.discountType === "percentage" && appliedCoupon.discountValue === 100) {
      await applyFullBypassCoupon.mutateAsync({ code: appliedCoupon.code });
      return; 
    }
    
    // Amount is in paise, ₹999 = 99900 paise
    await createOrder.mutateAsync({ 
      amount: 99900,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
          <p className="text-gray-400 mt-2">Manage your subscription and payment methods.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-2">Free Plan</h3>
            <p className="text-gray-400 text-sm mb-6">Perfect for getting started and exploring Indecode.</p>
            <div className="text-3xl font-bold mb-6">₹0<span className="text-lg text-gray-500 font-normal">/mo</span></div>
            <ul className="space-y-3 mb-8 text-sm text-gray-300">
              <li>✓ Basic AI code reviews</li>
              <li>✓ Up to 3 projects</li>
              <li>✓ Community support</li>
            </ul>
            <button className="w-full py-3 bg-gray-800 text-white rounded-xl font-medium" disabled>
              Current Plan
            </button>
          </div>

          <div className="bg-gradient-to-b from-indigo-900/40 to-gray-900 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 bg-indigo-600 text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
            <h3 className="text-xl font-bold mb-2">Pro Plan</h3>
            <p className="text-gray-400 text-sm mb-6">For professional developers and teams.</p>
            <div className="text-3xl font-bold mb-6">₹999<span className="text-lg text-gray-500 font-normal">/mo</span></div>
            <ul className="space-y-3 mb-8 text-sm text-gray-300 flex-1">
              <li>✓ Unlimited AI code reviews</li>
              <li>✓ Unlimited projects</li>
              <li>✓ Priority support</li>
              <li>✓ Advanced GitHub integrations</li>
            </ul>
            
            <div className="mt-4 mb-4 flex gap-2">
              <input 
                type="text" 
                placeholder="Coupon Code" 
                className="flex-1 bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={!!appliedCoupon || isCouponValidating}
              />
              {appliedCoupon ? (
                <button className="px-3 py-2 bg-gray-800 text-white rounded-lg text-sm" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}>
                  Remove
                </button>
              ) : (
                <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm" onClick={handleApplyCoupon} disabled={!couponCode || isCouponValidating}>
                  {isCouponValidating ? "..." : "Apply"}
                </button>
              )}
            </div>

            <button 
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
            >
              {loading ? "Processing..." : `Upgrade to Pro ${appliedCoupon ? `(${appliedCoupon.discountValue}${appliedCoupon.discountType === 'percentage' ? '%' : '₹'} OFF)` : ''}`}
            </button>
          </div>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Enterprise</h3>
          <p className="text-gray-400 text-sm mb-6">Need custom limits, dedicated infrastructure, or SSO? Let's talk.</p>
          <a href={`mailto:sales@${process.env.NEXT_PUBLIC_APP_DOMAIN || "indecode.in"}`} className="inline-block px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-medium transition-colors">
            Contact Sales
          </a>
        </div>
      </div>
    </div>
  );
}
