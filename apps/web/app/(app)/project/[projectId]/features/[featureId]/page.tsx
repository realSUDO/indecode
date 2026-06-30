"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";

import { Skeleton } from "~/components/ui/skeleton";
import { ExecutionTimeline } from "~/components/project/execution-timeline";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  submitted:   { bg: "bg-white/5",    text: "text-neutral-300",    dot: "bg-neutral-400" },
  discovery:   { bg: "bg-white/5",  text: "text-neutral-300",  dot: "bg-neutral-400" },
  prd_draft:   { bg: "bg-white/5",   text: "text-neutral-300",   dot: "bg-neutral-400" },
  prd_approved:{ bg: "bg-white/5",   text: "text-neutral-300",   dot: "bg-neutral-400" },
  planning:    { bg: "bg-white/5",    text: "text-neutral-300",    dot: "bg-neutral-400" },
  in_progress: { bg: "bg-white/5",  text: "text-neutral-300",  dot: "bg-neutral-400" },
  review:      { bg: "bg-white/5",  text: "text-neutral-300",  dot: "bg-neutral-400" },
  shipped:     { bg: "bg-white/5", text: "text-neutral-300", dot: "bg-neutral-400" },
};


const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted", discovery: "Discovery", prd_draft: "PRD Draft",
  prd_approved: "PRD Approved", planning: "Planning", in_progress: "In Progress",
  review: "Review", shipped: "Shipped",
};

// Old PIPELINE_TABS removed in favor of ExecutionTimeline

import { useFeatureSocket } from "~/hooks/use-feature-socket";

function getNextAction(status: string | undefined, projectId: string, featureId: string, router: any, prdReady: boolean) {
  if (status === "discovery") {
    return { label: "Continue Discovery", action: () => router.push(`/project/${projectId}/discovery`) };
  }
  if (status === "prd_draft") {
    if (!prdReady) return null; // Wait for PRD to be generated
    return { label: "Review PRD", action: () => router.push(`/project/${projectId}/features/${featureId}/prd`) };
  }
  if (status === "planning") {
    return { label: "View Tasks →", action: () => router.push(`/project/${projectId}/features/${featureId}/tasks`) };
  }
  if (status === "implementing") {
    return { label: "View Tasks →", action: () => router.push(`/project/${projectId}/features/${featureId}/tasks`) };
  }
  if (status === "in_progress") {
    return { label: "View Kanban Board →", action: () => router.push(`/project/${projectId}/features/${featureId}/tasks`) };
  }
  return null;
}

export default function FeatureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const featureId = params.featureId as string;
  const utils = trpc.useUtils();

  useFeatureSocket(featureId);

  const { data: feature, isLoading } = trpc.featureRequest.getById.useQuery(
    { featureRequestId: featureId }
  );

  // Fetch PRD status so we know whether to show "Review PRD" button
  const { data: prd } = trpc.prd.getByFeature.useQuery(
    { featureRequestId: featureId },
    {
      enabled: feature?.status === "prd_draft",
      // Light poll only while PRD is still being generated (draft state)
      refetchInterval: (query: any) => {
        const prdData = query?.state?.data;
        if (!prdData || (prdData.status === "draft" && (!prdData.content || prdData.content.length < 50))) {
          return 3000;
        }
        return false;
      }
    }
  );

  // PRD is ready if it has content — either in_review (ideal) or draft with actual content (legacy unstick)
  const prdReady = !!(prd?.content && prd.content.length > 50);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-6 space-y-8">
        <Skeleton className="w-24 h-4" />
        <div className="space-y-4">
          <Skeleton className="w-3/4 h-8" />
          <Skeleton className="w-full h-20" />
          <Skeleton className="w-1/3 h-4" />
        </div>
        <div>
          <Skeleton className="w-24 h-4 mb-3" />
          <div className="grid grid-cols-5 gap-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <Skeleton className="w-full h-24 rounded-2xl" />
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Feature request not found.</p>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[feature.status] ?? STATUS_STYLES.submitted;
  const nextAction = getNextAction(feature.status, projectId, featureId, router, prdReady);

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8 animate-in fade-in duration-500">
      {/* Top Nav & Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/project/${projectId}/features`)}
          onMouseEnter={() => utils.featureRequest.list.prefetch({ projectId })}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Features
        </button>

        <button
          onClick={() => {
            utils.featureRequest.getById.invalidate({ featureRequestId: featureId });
            utils.prd.getByFeature.invalidate({ featureRequestId: featureId });
            utils.task.listByFeature.invalidate({ featureRequestId: featureId });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 bg-white/5 hover:bg-white/10 hover:text-white rounded-md border border-white/5 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Status
        </button>
      </div>

      {/* Feature Header */}
      <div>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{feature.title}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle?.bg} ${statusStyle?.text}`}>
                {/* Add a ping animation for active AI states */}
                {(feature.status === "prd_draft" || feature.status === "planning") && (
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusStyle?.dot}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusStyle?.dot}`}></span>
                  </span>
                )}
                {feature.status !== "prd_draft" && feature.status !== "planning" && (
                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyle?.dot}`} />
                )}
                {STATUS_LABELS[feature.status] ?? feature.status}
              </span>
            </div>
            <p className="text-gray-400 mt-2 leading-relaxed">{feature.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
              <span>Source: {feature.source}</span>
              <span>·</span>
              <span>Created {new Date(feature.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Navigation */}
      <ExecutionTimeline 
        currentStatus={feature.status} 
        projectId={projectId} 
        featureId={featureId} 
      />

      {/* Next Action CTA */}
      {nextAction && (
        <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 flex items-center justify-between shadow-xl">
          <div>
            <h3 className="text-white font-medium flex items-center gap-2">
              Continue your workflow
              {(feature.status === "prd_draft" || feature.status === "planning") && (
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></div>
                </div>
              )}
            </h3>
            <p className="text-neutral-500 text-sm mt-1">
              {({
                submitted: "Start chatting with the AI PM to gather requirements.",
                discovery: "The AI PM is ready for your next message.",
                prd_draft: prdReady
                  ? "PRD is ready. Review and approve it to begin task planning."
                  : "AI is generating the PRD. This usually takes 30–60 seconds...",
                prd_approved: "PRD approved! Tasks will now be generated on the Kanban board.",
                planning: "AI is generating engineering tasks from your PRD...",
                in_progress: "AI is implementing your feature. Watch the Kanban board for live updates.",
              } as Record<string, string>)[feature.status as string] ?? "Continue your workflow."}
            </p>
          </div>
          <button
            onClick={nextAction.action}
            className="px-6 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-lg font-medium text-sm transition-all duration-300 whitespace-nowrap flex items-center gap-2"
          >
            {nextAction.label}
          </button>
        </div>
      )}
    </div>
  );
}
