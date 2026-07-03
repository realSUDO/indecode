"use client";

import { useParams } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { GitPullRequest, GitMerge } from "lucide-react";
import { DiffViewer } from "~/components/project/diff-viewer";

export default function PullRequestDetailPage() {
  const params = useParams();
  const pullRequestId = params.pullId as string;

  const { data: pr, isLoading: prLoading } = trpc.pullRequest.getById.useQuery({ pullRequestId });
  const { data: reviews, isLoading: reviewsLoading } = trpc.review.getByPullRequest.useQuery({ pullRequestId });
  const { data: diffData, isLoading: diffLoading } = trpc.pullRequest.getDiff.useQuery(
    { pullRequestId },
    { enabled: !!pr && pr.status !== "processing" }
  );

  if (prLoading || reviewsLoading || diffLoading) {
    return (
      <div className="space-y-4 w-full mx-auto p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!pr) return <div>Not found</div>;

  const latestReview = reviews?.[0];
  const issues = latestReview?.issues || [];

  return (
    <div className="flex flex-col h-full bg-[#0E0E11]">
      <div className="flex-none px-6 py-4 border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <GitPullRequest className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
              {pr.title}
              <Badge variant="outline" className="bg-white/5 border-white/10 font-normal py-0">#{pr.prNumber}</Badge>
            </h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-neutral-400">
              <span className="flex items-center gap-1.5"><Badge variant="secondary" className="capitalize text-[10px] h-5 py-0 bg-white/10">{pr.status}</Badge></span>
              <span>•</span>
              <span className="font-medium text-neutral-300">{pr.repository.fullName}</span>
              <span>•</span>
              <span>by {pr.authorLogin}</span>
            </div>
          </div>
        </div>
        
        {latestReview && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">AI Verdict</div>
              <Badge variant={latestReview.overallVerdict === "approved" ? "default" : "destructive"} className="px-3 py-1 text-sm font-semibold shadow-xl">
                {latestReview.overallVerdict.toUpperCase()}
              </Badge>
            </div>
            {pr.status === "open" && latestReview.overallVerdict === "approved" && (
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-500/50">
                <GitMerge className="w-4 h-4" /> Merge PR
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[1400px] mx-auto w-full space-y-8">
          {latestReview?.summary && (
            <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl shadow-xl">
              <h3 className="text-blue-400 font-semibold mb-2">Review Summary</h3>
              <p className="text-blue-100/70 text-sm leading-relaxed">{latestReview.summary}</p>
            </div>
          )}

          {!diffData ? (
            <div className="text-center py-12 text-neutral-500 border border-dashed border-white/10 rounded-2xl">
              {pr.status === "processing" ? "AI is currently implementing this feature..." : "No diff available."}
            </div>
          ) : (
            <DiffViewer diffStr={diffData.diff} issues={issues as any} />
          )}
        </div>
      </div>
    </div>
  );
}
