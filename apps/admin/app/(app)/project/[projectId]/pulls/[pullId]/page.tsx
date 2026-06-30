"use client";

import { useParams } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { AlertCircle, CheckCircle2, MessageSquare, AlertTriangle, FileText } from "lucide-react";

export default function PullRequestDetailPage() {
  const params = useParams();
  const pullRequestId = params.pullId as string;

  const { data: pr, isLoading: prLoading } = trpc.pullRequest.getById.useQuery({ pullRequestId });
  const { data: reviews, isLoading: reviewsLoading } = trpc.review.getByPullRequest.useQuery({ pullRequestId });

  if (prLoading || reviewsLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (!pr) return <div>Not found</div>;

  const latestReview = reviews?.[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{pr.title}</h2>
        <div className="flex items-center gap-2 mt-2 text-muted-foreground">
          <Badge variant="outline">{pr.status}</Badge>
          <span>{pr.repository.fullName}#{pr.prNumber}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Code Review</CardTitle>
        </CardHeader>
        <CardContent>
          {!latestReview ? (
            <div className="text-center py-8 text-muted-foreground">
              {pr.status === "processing" ? "AI is currently reviewing this pull request..." : "No AI review generated yet."}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-lg">Verdict:</span>
                  <Badge variant={latestReview.overallVerdict === "approved" ? "default" : "destructive"}>
                    {latestReview.overallVerdict.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm">{latestReview.summary}</p>
              </div>

              {latestReview.issues && latestReview.issues.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Identified Issues</h3>
                  {latestReview.issues.map((issue: any) => (
                    <div key={issue.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        {issue.severity === "blocking" && <AlertCircle className="w-4 h-4 text-destructive" />}
                        {issue.severity === "high" && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                        {issue.severity === "suggestion" && <MessageSquare className="w-4 h-4 text-blue-500" />}
                        <Badge variant="outline" className="capitalize">{issue.severity}</Badge>
                        <h4 className="font-medium">{issue.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{issue.description}</p>
                      
                      {issue.filePath && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 bg-muted p-1.5 rounded inline-flex">
                          <FileText className="w-3 h-3" />
                          <span>{issue.filePath}</span>
                          {issue.lineNumber && <span>:{issue.lineNumber}</span>}
                        </div>
                      )}
                      
                      {issue.suggestion && (
                        <div className="mt-2 text-sm bg-blue-500/10 text-blue-700 dark:text-blue-400 p-3 rounded-md">
                          <span className="font-semibold">Suggestion:</span> {issue.suggestion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>No issues found! The code looks great.</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
