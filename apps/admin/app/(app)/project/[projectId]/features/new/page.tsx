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
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push(`/project/${projectId}/features`)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Features
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>New Feature Request</CardTitle>
          <CardDescription>
            Describe what you want to build. Our AI Discovery Agent will help you refine the requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Add user authentication with GitHub OAuth"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={createFeature.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the feature you want to build. Include any context, user stories, or requirements you already know about..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                disabled={createFeature.isPending}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/project/${projectId}/features`)}
                disabled={createFeature.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createFeature.isPending}>
                {createFeature.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Feature Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
