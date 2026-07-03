"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function NewFeaturePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const createFeature = trpc.featureRequest.create.useMutation({
    onSuccess: (data) => {
      toast.success("Feature request created!");
      router.push(`/project/${projectId}/features/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create feature request");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in both title and description");
      return;
    }
    createFeature.mutate({
      projectId,
      title: title.trim(),
      description: description.trim(),
    });
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-4 py-12 md:p-8 animate-in fade-in duration-500">
      <div className="w-full max-w-2xl">
        <Button
          variant="ghost"
          className="mb-8 text-neutral-400 hover:text-white hover:bg-white/5 px-0"
          onClick={() => router.push(`/project/${projectId}/features`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Features
        </Button>

        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">What do you want to build?</h1>
          <p className="text-neutral-400 text-sm">
            Describe your idea below. Our AI PM will chat with you to clarify the requirements before drafting the PRD.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-neutral-300 ml-1">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Add GitHub OAuth login"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={createFeature.isPending}
              className="h-12 bg-white/5 border-white/10 text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-neutral-300 ml-1">Context & Details</Label>
            <Textarea
              id="description"
              placeholder="Write down any initial thoughts, user stories, or specific requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              disabled={createFeature.isPending}
              className="bg-white/5 border-white/10 text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30 rounded-xl resize-none py-3"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              disabled={createFeature.isPending}
              className="h-11 px-8 bg-white hover:bg-zinc-200 text-black rounded-xl transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] font-medium"
            >
              {createFeature.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                "Start Discovery"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
