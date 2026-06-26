"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Loader2, ArrowLeft, MessageSquare, FileText, LayoutList, GitPullRequest, Rocket } from "lucide-react";

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

const pipelineSteps = [
  { key: "discovery", label: "Discovery", icon: MessageSquare },
  { key: "prd", label: "PRD", icon: FileText },
  { key: "tasks", label: "Tasks", icon: LayoutList },
  { key: "reviews", label: "Reviews", icon: GitPullRequest },
  { key: "release", label: "Release", icon: Rocket },
];

export default function FeatureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const featureId = params.featureId as string;

  const { data: feature, isLoading } = trpc.featureRequest.getById.useQuery({
    featureRequestId: featureId,
  });

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <p className="text-muted-foreground">Feature request not found.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push(`/project/${projectId}/features`)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Features
      </Button>

      {/* Feature Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">{feature.title}</h1>
          <Badge variant="outline" className={statusColors[feature.status] || ""}>
            {statusLabels[feature.status] || feature.status}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-2">{feature.description}</p>
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <span>Source: {feature.source}</span>
          <span>Created: {new Date(feature.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {pipelineSteps.map((step) => {
          const Icon = step.icon;
          const isActive = feature.status === step.key || 
            (step.key === "discovery" && (feature.status === "submitted" || feature.status === "discovery")) ||
            (step.key === "prd" && feature.status === "prd_draft");
          
          return (
            <Card
              key={step.key}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                isActive ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => {
                if (step.key === "discovery") {
                  router.push(`/project/${projectId}/features/${featureId}/discovery`);
                }
                // Other tabs will be implemented in future phases
              }}
            >
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Icon className={`w-6 h-6 mb-2 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick action */}
      {(feature.status === "submitted" || feature.status === "discovery") && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Start Discovery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Chat with our AI Product Manager to refine your requirements and gather all the details needed for a solid PRD.
            </p>
            <Button onClick={() => router.push(`/project/${projectId}/features/${featureId}/discovery`)}>
              Open Discovery Chat
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
