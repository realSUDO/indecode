"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Loader2, Plus, Lightbulb } from "lucide-react";

const statusColors: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  discovery: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  prd_draft: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  prd_approved: "bg-green-500/10 text-green-500 border-green-500/20",
  planning: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  in_progress: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  review: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  shipped: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
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

  const { data: features, isLoading } = trpc.featureRequest.list.useQuery({
    projectId,
  });

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
          <p className="text-muted-foreground mt-2">
            Manage feature requests and track them through the delivery pipeline.
          </p>
        </div>
        <Button onClick={() => router.push(`/project/${projectId}/features/new`)}>
          <Plus className="w-4 h-4 mr-2" />
          New Feature
        </Button>
      </div>

      {!features || features.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Lightbulb className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No feature requests yet</h3>
            <p className="text-muted-foreground mt-2 text-center max-w-md">
              Create your first feature request to kick off the AI-powered discovery process.
            </p>
            <Button className="mt-6" onClick={() => router.push(`/project/${projectId}/features/new`)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Feature Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {features.map((feature: any) => (
            <Card
              key={feature.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => router.push(`/project/${projectId}/features/${feature.id}`)}
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
