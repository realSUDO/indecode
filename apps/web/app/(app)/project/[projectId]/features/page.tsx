"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Loader2, Plus, Lightbulb, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

import { RepoSelector } from "~/components/project/repo-selector";

const statusColors: Record<string, string> = {
  submitted: "bg-white/5 text-neutral-300 border-white/10",
  discovery: "bg-white/5 text-neutral-300 border-white/10",
  prd_draft: "bg-white/5 text-neutral-300 border-white/10",
  prd_approved: "bg-white/5 text-neutral-300 border-white/10",
  planning: "bg-white/5 text-neutral-300 border-white/10",
  in_progress: "bg-white/5 text-neutral-300 border-white/10",
  review: "bg-white/5 text-neutral-300 border-white/10",
  shipped: "bg-white text-black font-semibold",
};


const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  discovery: "Discovery",
  prd_draft: "PRD Draft",
  prd_approved: "PRD Approved",
  planning: "Planning",
  in_progress: "In Progress",
  review: "Review",
  shipped: "Shipped",
};

export default function FeaturesListPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const utils = trpc.useUtils();

  const { data: features, isLoading } = trpc.featureRequest.list.useQuery({
    projectId,
  });

  const { data: connectedRepos } = trpc.github.listConnectedRepos.useQuery({ projectId });
  const hasSyncedRepo = connectedRepos?.some((r: any) => r.chunkCount > 0);


  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Requests</h1>
        </div>
        <div className="flex items-center gap-4">
          <RepoSelector projectId={projectId} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => router.push(`/project/${projectId}/features/new`)}
                    disabled={!hasSyncedRepo}
                  >
                    New Feature
                  </Button>
                </span>
              </TooltipTrigger>
              {!hasSyncedRepo && (
                <TooltipContent side="bottom" className="flex items-center gap-2 border-amber-500/30 bg-[#0A0A0A] text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Connect and sync a repository first
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {!features || features.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Lightbulb className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No feature requests yet</h3>
            <p className="text-muted-foreground mt-2 text-center max-w-md">
              Create your first feature request to kick off the AI-powered discovery process.
            </p>
            <Button className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => router.push(`/project/${projectId}/features/new`)}>
              New Feature
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {features.map((feature: any) => (
            <Card
              key={feature.id}
              className="cursor-pointer border-white/5 bg-[#0A0A0A] hover:bg-[#111111] transition-all hover:border-white/10 group"
              onClick={() => router.push(`/project/${projectId}/features/${feature.id}`)}
              onMouseEnter={() => {
                utils.featureRequest.getById.prefetch({ featureRequestId: feature.id });
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <Badge variant="outline" className={statusColors[feature.status] || ""}>
                    {statusLabels[feature.status] || feature.status}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Source: {feature.source}</span>
                  <span>Created: {new Date(feature.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
