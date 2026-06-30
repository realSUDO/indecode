"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";

import { Skeleton } from "~/components/ui/skeleton";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  submitted:   { bg: "bg-blue-500/10",    text: "text-blue-400",    dot: "bg-blue-400" },
  discovery:   { bg: "bg-purple-500/10",  text: "text-purple-400",  dot: "bg-purple-400" },
  prd_draft:   { bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400" },
  prd_approved:{ bg: "bg-green-500/10",   text: "text-green-400",   dot: "bg-green-400" },
  planning:    { bg: "bg-cyan-500/10",    text: "text-cyan-400",    dot: "bg-cyan-400" },
  in_progress: { bg: "bg-orange-500/10",  text: "text-orange-400",  dot: "bg-orange-400" },
  review:      { bg: "bg-indigo-500/10",  text: "text-indigo-400",  dot: "bg-indigo-400" },
  shipped:     { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted", discovery: "Discovery", prd_draft: "PRD Draft",
  prd_approved: "PRD Approved", planning: "Planning", in_progress: "In Progress",
  review: "Review", shipped: "Shipped",
};

const PIPELINE_TABS = [
  {
    key: "discovery",
    label: "Discovery",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    activeFor: ["submitted", "discovery"],
  },
  {
    key: "prd",
    label: "PRD",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    activeFor: ["prd_draft", "prd_approved"],
  },
  {
    key: "tasks",
    label: "Tasks",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    activeFor: ["planning", "in_progress", "review"],
  },
  {
    key: "reviews",
    label: "Reviews",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    activeFor: ["review"],
  },
  {
    key: "release",
    label: "Release",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3l14 9-14 9V3z" />
      </svg>
    ),
    activeFor: ["shipped"],
  },
];

function getNextAction(status: string, projectId: string, featureId: string, router: ReturnType<typeof useRouter>) {
  if (status === "submitted" || status === "discovery") {
    return { label: "Open Discovery Chat →", action: () => router.push(`/project/${projectId}/features/${featureId}/discovery`) };
  }
  if (status === "prd_draft") {
    return { label: "Review PRD →", action: () => router.push(`/project/${projectId}/features/${featureId}/prd`) };
  }
  if (status === "prd_approved" || status === "planning") {
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

  const { data: feature, isLoading } = trpc.featureRequest.getById.useQuery(
    { featureRequestId: featureId },
    {
      refetchInterval: (query: any) => {
        const status = query?.state?.data?.status || query?.status;
        // Poll aggressively when an AI background process is running (e.g. generating PRD or planning tasks)
        return (status === "prd_draft" || status === "planning") ? 2000 : false;
      }
    }
  );

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
  const nextAction = getNextAction(feature.status, projectId, featureId, router);

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8 animate-in fade-in duration-500">
      {/* Back */}
      <button
        onClick={() => router.push(`/project/${projectId}/features`)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Features
      </button>

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
      <div>
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">Pipeline</p>
        <div className="grid grid-cols-5 gap-2">
          {PIPELINE_TABS.map((tab, i) => {
            const isActive = tab.activeFor.includes(feature.status);
            const isDone = PIPELINE_TABS.slice(0, i).some(prev =>
              prev.activeFor.some(s => {
                const statusOrder = ["submitted", "discovery", "prd_draft", "prd_approved", "planning", "in_progress", "review", "shipped"];
                const featureIdx = statusOrder.indexOf(feature.status);
                const tabIdx = Math.max(...prev.activeFor.map(x => statusOrder.indexOf(x)));
                return featureIdx > tabIdx;
              })
            );

            return (
              <button
                key={tab.key}
                onClick={() => router.push(`/project/${projectId}/features/${featureId}/${tab.key}`)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-300 text-center relative overflow-hidden group ${
                  isActive
                    ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                    : isDone
                    ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-500 hover:border-emerald-600/50"
                    : "border-gray-800 bg-gray-950 text-gray-600 hover:border-gray-700 hover:text-gray-400"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent opacity-50 pointer-events-none" />
                )}
                <div className={`transform transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                  {tab.icon}
                </div>
                <span className="text-xs font-medium z-10">{tab.label}</span>
                {isDone && <span className="absolute top-2 right-2 text-xs text-emerald-600">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Next Action CTA */}
      {nextAction && (
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 flex items-center justify-between shadow-xl shadow-black/50">
          <div>
            <h3 className="text-white font-medium flex items-center gap-2">
              Continue your workflow
              {(feature.status === "prd_draft" || feature.status === "planning") && (
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                </div>
              )}
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              {({
                submitted: "Start chatting with the AI PM to gather requirements.",
                discovery: "The AI PM is ready for your next message.",
                prd_draft: "AI is generating the PRD. You can review it once it completes, or view the draft now.",
                prd_approved: "PRD approved! Tasks will now be generated on the Kanban board.",
                planning: "AI is generating engineering tasks from your PRD...",
                in_progress: "Your Kanban board is ready for development.",
              } as Record<string, string>)[feature.status as string] ?? "Continue your workflow."}
            </p>
          </div>
          <button
            onClick={nextAction.action}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 whitespace-nowrap flex items-center gap-2"
          >
            {nextAction.label}
          </button>
        </div>
      )}
    </div>
  );
}
