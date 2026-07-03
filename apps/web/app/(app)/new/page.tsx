"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Textarea } from "~/components/ui/textarea";

export default function NewProjectPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [featureRequest, setFeatureRequest] = useState("");
  
  const createProject = trpc.project.create.useMutation();
  const submitFeature = trpc.featureRequest.create.useMutation();

  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const featureCookie = cookies.find((row) => row.startsWith("indecode-cached-feature="));
    if (featureCookie) {
      setFeatureRequest(decodeURIComponent(featureCookie.split("=")[1] || ""));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      const project = await createProject.mutateAsync({ name: projectName });
      
      if (featureRequest.trim()) {
        await submitFeature.mutateAsync({
          projectId: project.id,
          title: featureRequest,
          description: "Auto-generated from creation form.",
        });
        
        // Clear the cookie since we've used it
        document.cookie = "indecode-cached-feature=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = `indecode-cached-feature=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${process.env.NODE_ENV === "production" ? ".indecode.in" : "localhost"}; path=/;`;
      }
      
      toast.success("Project created successfully!");
      router.push(`/project/${project.id}/features`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    }
  };

  return (
    <div className="flex flex-col items-center pt-24 px-4 min-h-[calc(100vh-100px)]">
      <div className="w-full max-w-xl flex flex-col items-center">
        
        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6">
          <Plus className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 text-center">
          Create a New Project
        </h1>
        <p className="text-neutral-400 text-center mb-10">
          Set up your workspace and kick off your first feature request.
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Project Name</label>
            <Input 
              required 
              value={projectName} 
              onChange={(e) => setProjectName(e.target.value)} 
              placeholder="e.g. Next.js SaaS App"
              className="bg-neutral-950/50 border-white/10 text-white h-12 text-lg focus-visible:ring-white/20 transition-all"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neutral-400" />
              First Feature Request <span className="text-neutral-500">(Optional)</span>
            </label>
            <Textarea
              value={featureRequest} 
              onChange={(e) => setFeatureRequest(e.target.value)} 
              placeholder="e.g. Implement a dark mode toggle..."
              className="bg-neutral-950/50 border-white/10 text-white min-h-[120px] text-base resize-none focus-visible:ring-white/20 transition-all"
            />
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={createProject.isPending || submitFeature.isPending || !projectName.trim()}
              className="w-full h-12 bg-white text-black hover:bg-neutral-200 text-base font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all rounded-xl"
            >
              {(createProject.isPending || submitFeature.isPending) ? <Loader2 className="animate-spin w-5 h-5" /> : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
