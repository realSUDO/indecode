"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { toast } from "sonner";
import { RepoSelector } from "~/components/project/repo-selector";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const { data: session } = trpc.auth.getSession.useQuery();

  // Form states
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [featureRequest, setFeatureRequest] = useState("");
  
  // Trpc mutations
  const completeOnboarding = trpc.auth.completeOnboarding.useMutation();
  const createProject = trpc.project.create.useMutation();
  const submitFeature = trpc.featureRequest.create.useMutation();

  useEffect(() => {
    if (session?.user?.name && !name) {
      setName(session.user.name);
    }
  }, [session, name]);

  useEffect(() => {
    // Read cached feature from cookie
    const cookies = document.cookie.split("; ");
    const featureCookie = cookies.find((row) => row.startsWith("indecode-cached-feature="));
    if (featureCookie) {
      setFeatureRequest(decodeURIComponent(featureCookie.split("=")[1]));
    }
  }, []);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error("You must agree to the Privacy Policy and Terms of Service.");
      return;
    }
    
    try {
      await completeOnboarding.mutateAsync({
        name,
        company,
        onboardingRole: role,
      });
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      const p = await createProject.mutateAsync({ name: projectName });
      setProjectId(p.id);
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    }
  };

  const handleStep3 = () => {
    setStep(4);
  };

  const handleStep4 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureRequest.trim() || !projectId) return;

    try {
      await submitFeature.mutateAsync({
        projectId,
        title: featureRequest,
        description: "Generated from onboarding.",
      });
      
      // Clear cookie
      document.cookie = "indecode-cached-feature=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `indecode-cached-feature=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${process.env.NODE_ENV === "production" ? ".indecode.in" : "localhost"}; path=/;`;
      
      toast.success("Feature request submitted successfully!");
      router.push(`/project/${projectId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feature request");
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-10">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${s <= step ? "bg-white" : "bg-neutral-800"}`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Welcome to Indecode</h1>
                <p className="text-neutral-400">Let's get your profile set up.</p>
              </div>
              <form onSubmit={handleStep1} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">Full Name</label>
                  <Input 
                    required 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="bg-neutral-900 border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">Role</label>
                  <Input 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)} 
                    placeholder="e.g. Software Engineer, Founder" 
                    className="bg-neutral-900 border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">Company (Optional)</label>
                  <Input 
                    value={company} 
                    onChange={(e) => setCompany(e.target.value)} 
                    className="bg-neutral-900 border-neutral-800 text-white"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="terms" 
                    checked={agreed} 
                    onCheckedChange={(c) => setAgreed(c as boolean)} 
                    className="border-neutral-600 data-[state=checked]:bg-white data-[state=checked]:text-black"
                  />
                  <label htmlFor="terms" className="text-sm text-neutral-400">
                    I agree to the <a href="https://indecode.in/privacy" target="_blank" className="text-white hover:underline">Privacy Policy</a> and <a href="https://indecode.in/terms" target="_blank" className="text-white hover:underline">Terms of Service</a>.
                  </label>
                </div>
                <Button 
                  type="submit" 
                  disabled={completeOnboarding.isPending}
                  className="w-full bg-white text-black hover:bg-neutral-200 mt-4"
                >
                  {completeOnboarding.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Continue"}
                </Button>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Create Workspace</h1>
                <p className="text-neutral-400">What are we building today?</p>
              </div>
              <form onSubmit={handleStep2} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">Project Name</label>
                  <Input 
                    required 
                    value={projectName} 
                    onChange={(e) => setProjectName(e.target.value)} 
                    placeholder="e.g. Acme Web App"
                    className="bg-neutral-900 border-neutral-800 text-white"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={createProject.isPending}
                  className="w-full bg-white text-black hover:bg-neutral-200"
                >
                  {createProject.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Create Project"}
                </Button>
              </form>
            </motion.div>
          )}

          {step === 3 && projectId && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Connect Repository</h1>
                <p className="text-neutral-400">Link a GitHub repository to {projectName}.</p>
              </div>
              
              <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 flex flex-col items-center text-center space-y-4">
                <p className="text-sm text-neutral-400 mb-2">Select a repository to sync the codebase.</p>
                <div className="w-full flex justify-center">
                  <RepoSelector projectId={projectId} />
                </div>
              </div>

              <Button 
                onClick={handleStep3}
                className="w-full bg-white text-black hover:bg-neutral-200"
              >
                Continue to Next Step
              </Button>
            </motion.div>
          )}

          {step === 4 && projectId && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Your First Feature</h1>
                <p className="text-neutral-400">We grabbed this from your request.</p>
              </div>
              
              <form onSubmit={handleStep4} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">Feature Request</label>
                  <Input 
                    required 
                    value={featureRequest} 
                    onChange={(e) => setFeatureRequest(e.target.value)} 
                    className="bg-neutral-900 border-neutral-800 text-white"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={submitFeature.isPending}
                  className="w-full bg-white text-black hover:bg-neutral-200"
                >
                  {submitFeature.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Ship it"}
                </Button>
                
                <div className="pt-4 text-center">
                  <button 
                    type="button"
                    onClick={() => router.push(`/project/${projectId}`)}
                    className="text-sm text-neutral-500 hover:text-white transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
