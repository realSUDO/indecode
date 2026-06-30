"use client";

import { useParams } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import Link from "next/link";
import { GitPullRequest } from "lucide-react";

export default function PullRequestsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { data: pullRequests, isLoading } = trpc.pullRequest.listByProject.useQuery({ projectId });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold tracking-tight">Pull Requests</h2>
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pull Requests</h2>
        <p className="text-muted-foreground">Monitor and review code changes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Pull Requests</CardTitle>
          <CardDescription>Pull requests tracked by Indecode from connected repositories.</CardDescription>
        </CardHeader>
        <CardContent>
          {!pullRequests || pullRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No pull requests found.
            </div>
          ) : (
            <div className="space-y-4">
              {pullRequests.map((pr: any) => (
                <Link key={pr.id} href={`/project/${projectId}/pulls/${pr.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors">
                        <GitPullRequest className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-base">{pr.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{pr.repoFullName}#{pr.prNumber}</span>
                          <span>•</span>
                          <span>by {pr.authorLogin}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{pr.status}</Badge>
                      {pr.latestReviewVerdict && (
                        <Badge variant={pr.latestReviewVerdict === "approved" ? "default" : "destructive"}>
                          {pr.latestReviewVerdict}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
