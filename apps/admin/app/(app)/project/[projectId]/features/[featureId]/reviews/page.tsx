"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { useState } from "react";

const SEVERITY_STYLES: Record<string, string> = {
  blocking: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  suggestion: "bg-gray-500/10 text-gray-400 border-gray-700",
};

export default function FeatureReviewsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const featureId = params.featureId as string;

  const { data: pr, isLoading: isPrLoading } = trpc.pullRequest.getByFeatureId.useQuery({ featureRequestId: featureId });

  if (isPrLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-6 space-y-8 text-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h2 className="text-xl font-semibold text-white">No Pull Request Found</h2>
          <p className="text-gray-400 mt-2">A pull request hasn't been opened for this feature yet.</p>
        </div>
      </div>
    );
  }

  const latestReview = pr.reviews && pr.reviews.length > 0 ? pr.reviews[0] : null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Code Review</h1>
          <p className="text-gray-400 mt-1">
            Analyzing PR #{pr.prNumber} in {pr.repository.fullName}
          </p>
        </div>
        <button
          onClick={() => window.open(`https://github.com/${pr.repository.fullName}/pull/${pr.prNumber}`, '_blank')}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors border border-gray-700"
        >
          View on GitHub
        </button>
      </div>

      {!latestReview ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-white">Analysis in Progress</h2>
          <p className="text-gray-400 mt-2 max-w-md mx-auto">
            The Inde-Reviewer AI is currently analyzing your pull request against the PRD and Engineering Tasks. This usually takes 1-2 minutes.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Review Summary */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-medium text-white">Review Summary</h2>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${
                latestReview.overallVerdict === "approved" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                latestReview.overallVerdict === "changes_required" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                "bg-amber-500/10 text-amber-500 border-amber-500/20"
              } border`}>
                {latestReview.overallVerdict.replace("_", " ")}
              </span>
            </div>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{latestReview.summary}</p>
          </div>

          {/* Issues List */}
          {latestReview.issues && latestReview.issues.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mt-8 mb-4">Identified Issues</h3>
              {latestReview.issues.map((issue: any) => (
                <div key={issue.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider border ${SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.medium}`}>
                            {issue.severity}
                          </span>
                          <span className="text-sm text-gray-500 font-mono">
                            {issue.filePath}{issue.lineNumber ? `:${issue.lineNumber}` : ''}
                          </span>
                        </div>
                        <h4 className="text-base font-medium text-white mb-2">{issue.title}</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">{issue.description}</p>
                      </div>
                    </div>
                  </div>
                  {issue.suggestion && (
                    <div className="bg-gray-950/50 border-t border-gray-800 p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Suggested Fix</p>
                      <pre className="text-sm text-gray-300 font-mono bg-black/40 p-4 rounded-lg overflow-x-auto border border-gray-800">
                        {issue.suggestion}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-emerald-400">No Issues Found</h3>
              <p className="text-emerald-500/60 mt-2 text-sm">The AI reviewer did not identify any issues in this pull request.</p>
            </div>
          )}

          {/* Continue Action */}
          <div className="flex justify-end pt-6">
            <button
              onClick={() => router.push(`/project/${projectId}/features/${featureId}/release`)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
            >
              Continue to Release →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
