"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Github, Code2, Sparkles, Zap, ArrowRight, Loader2 } from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { motion } from "framer-motion";

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    const isDev = process.env.NODE_ENV !== "production";
    const dashboardUrl = isDev 
      ? "http://localhost:3003/dashboard"
      : `https://in.${process.env.NEXT_PUBLIC_APP_DOMAIN || "indecode.in"}/dashboard`;

    await authClient.signIn.social({
      provider: "github",
      callbackURL: dashboardUrl,
    });
  };

  return (
    <div className="min-h-screen bg-[#000000] flex text-white selection:bg-white selection:text-black">
      {/* Left side: Premium Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 border-r border-white/5 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-neutral-900/40 via-[#000000] to-[#000000]" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Code2 className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-bold tracking-tight">Indecode</span>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h1 className="text-5xl font-bold tracking-tighter leading-[1.1]">
            Build software at the speed of thought.
          </h1>
          <p className="text-neutral-400 text-lg leading-relaxed">
            Connect your repository, describe your feature, and let our AI agents handle the planning, implementation, and pull requests.
          </p>
          
          <div className="pt-8 grid grid-cols-2 gap-6 border-t border-white/10">
            <div className="space-y-2">
              <Sparkles className="w-5 h-5 text-neutral-300" />
              <h3 className="font-semibold text-neutral-200">AI Context</h3>
              <p className="text-sm text-neutral-500">Understands your entire codebase instantly.</p>
            </div>
            <div className="space-y-2">
              <Zap className="w-5 h-5 text-neutral-300" />
              <h3 className="font-semibold text-neutral-200">Autonomous</h3>
              <p className="text-sm text-neutral-500">Writes code, runs tests, and opens PRs.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <div className="w-full max-w-[400px] space-y-8">
          
          <div className="space-y-2 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-8 lg:hidden">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Code2 className="w-5 h-5 text-black" />
              </div>
              <span className="text-xl font-bold tracking-tight">Indecode</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-neutral-400">Sign in to your account to continue.</p>
          </div>

          <div className="space-y-4">
            <Button 
              className="w-full h-12 bg-white text-black hover:bg-neutral-200 text-sm font-semibold relative overflow-hidden group" 
              onClick={handleSignIn}
              disabled={isLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
              {isLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Github className="w-5 h-5 mr-2" />
              )}
              {isLoading ? "Connecting..." : "Continue with GitHub"}
              {!isLoading && <ArrowRight className="w-4 h-4 absolute right-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
            </Button>
            
            <p className="text-xs text-center text-neutral-500 pt-4">
              By continuing, you agree to our <a href="https://indecode.in/terms" className="underline hover:text-white">Terms of Service</a> and <a href="https://indecode.in/privacy" className="underline hover:text-white">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
