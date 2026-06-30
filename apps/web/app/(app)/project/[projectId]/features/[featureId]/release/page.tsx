"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { useState } from "react";
import confetti from "canvas-confetti";

export default function FeatureReleasePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const featureId = params.featureId as string;

  const utils = trpc.useUtils();
  const { data: feature, isLoading: isFeatureLoading } = trpc.featureRequest.getById.useQuery({ featureRequestId: featureId });
  const { data: pr, isLoading: isPrLoading } = trpc.pullRequest.getByFeatureId.useQuery({ featureRequestId: featureId });
  
  const [commitMessage, setCommitMessage] = useState("");

  const updateStatus = trpc.featureRequest.updateStatus.useMutation({
    onSuccess: () => {
      utils.featureRequest.getById.invalidate({ featureRequestId: featureId });
      fireConfetti();
    }
  });

  const mergePr = trpc.pullRequest.merge.useMutation({
    onSuccess: () => {
      utils.featureRequest.getById.invalidate({ featureRequestId: featureId });
      utils.pullRequest.getByFeatureId.invalidate({ featureRequestId: featureId });
      fireConfetti();
    }
  });

  const fireConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ffffff', '#a3a3a3', '#525252']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#ffffff', '#a3a3a3', '#525252']
        });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleShipIt = async () => {
    if (pr && pr.status !== "merged") {
      await mergePr.mutateAsync({
        pullRequestId: pr.id,
        commitMessage: commitMessage || `Merge feature: ${feature?.title}`
      });
    } else {
      await updateStatus.mutateAsync({
        featureRequestId: featureId,
        status: "shipped"
      });
    }
  };

  if (isFeatureLoading || isPrLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!feature) return null;

  const isShipped = feature.status === "shipped";
  const hasPr = !!pr;
  const isPrMerged = pr?.status === "merged";
  const latestReview = pr?.reviews?.[0];
  const isApproved = latestReview?.overallVerdict === "approved";
  const isPending = updateStatus.isPending || mergePr.isPending;

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Release Readiness</h1>
        <p className="text-gray-400 mt-1">Final checks before shipping {feature.title}</p>
      </div>

      {isShipped ? (
        <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 relative z-10">Successfully Shipped!</h2>
          <p className="text-neutral-400 text-lg max-w-md mx-auto relative z-10">
            This feature has been marked as shipped and deployed to production. Great work!
          </p>
          <button
            onClick={() => router.push(`/project/${projectId}/features`)}
            className="mt-8 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors border border-white/10 relative z-10"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 animate-in fade-in duration-500">
          <div className="md:col-span-3 space-y-6">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-medium text-white mb-6">Readiness Checklist</h3>
              
              <div className="space-y-4">
                <ChecklistItem 
                  title="PRD Approved" 
                  description="Product requirements have been defined and approved."
                  isDone={true} 
                />
                <ChecklistItem 
                  title="Code Implemented" 
                  description="A pull request has been opened for this feature."
                  isDone={hasPr} 
                />
                <ChecklistItem 
                  title="AI Review Passed" 
                  description="The code review did not find any blocking issues."
                  isDone={isApproved || isPrMerged} 
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-gradient-to-b from-white/[0.05] to-[#0A0A0A] border border-white/10 rounded-2xl p-6 text-center h-full flex flex-col justify-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                <svg className="w-8 h-8 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Ready to Ship?</h3>
              <p className="text-neutral-400 text-sm mb-6">
                {hasPr && !isPrMerged ? "This will automatically merge your Pull Request on GitHub and mark the feature as shipped." : "Once approved, this feature will be marked as shipped and close the delivery loop."}
              </p>
              
              {hasPr && !isPrMerged && (
                <div className="mb-6 text-left">
                  <label className="block text-xs font-mono text-neutral-400 mb-2 uppercase tracking-wider">Commit Message</label>
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder={`Merge feature: ${feature.title}`}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 resize-none h-24"
                  />
                </div>
              )}
              
              <button
                onClick={handleShipIt}
                disabled={isPending}
                className="w-full py-4 bg-white hover:bg-neutral-200 disabled:opacity-50 text-black rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 mt-auto"
              >
                {isPending ? (
                  <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{hasPr && !isPrMerged ? "Merge & Ship It" : "Ship It"}</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistItem({ title, description, isDone }: { title: string, description: string, isDone: boolean }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-[#050505]">
      <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
        isDone ? "bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "bg-transparent border-white/20 text-neutral-600"
      }`}>
        {isDone ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="text-xs font-bold font-mono">?</span>
        )}
      </div>
      <div>
        <h4 className={`text-base font-medium ${isDone ? "text-white" : "text-neutral-400"}`}>{title}</h4>
        <p className="text-sm text-neutral-500 mt-1">{description}</p>
      </div>
    </div>
  );
}
