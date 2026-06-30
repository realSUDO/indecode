"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { trpc } from "~/trpc/client";

import { Skeleton } from "~/components/ui/skeleton";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    in_review: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const labels: Record<string, string> = {
    draft: "Generating Draft...",
    in_review: "In Review",
    approved: "Approved",
    rejected: "Rejected",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] ?? styles.draft}`}>
      {status === "draft" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-400"></span>
        </span>
      )}
      {labels[status] ?? status}
    </span>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  // Simple markdown rendering without a library
  const html = content
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-white mt-8 mb-4 border-b border-gray-800 pb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium text-gray-200 mt-6 mb-2">$1</h3>')
    .replace(/^\*\*(.+?)\*\*/gm, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-5 list-disc text-gray-300 py-0.5">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-5 list-decimal text-gray-300 py-0.5">$2</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '\n');

  return (
    <div
      className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed tracking-wide"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function PRDPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const featureId = params.featureId as string;

  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const utils = trpc.useUtils();
  
  const { data: feature } = trpc.featureRequest.getById.useQuery({ featureRequestId: featureId });
  
  const { data: prd, isLoading } = trpc.prd.getByFeature.useQuery(
    { featureRequestId: featureId },
    {
      // Poll if PRD doesn't exist yet but feature is in prd_draft, or if PRD is currently in draft (generating)
      refetchInterval: (query: any) => {
        const prdData = query?.state?.data || query?.data;
        if (!prdData && feature?.status === "prd_draft") return 2000;
        if (prdData?.status === "draft") return 2000;
        return false;
      }
    }
  );

  const updateMutation = trpc.prd.update.useMutation({
    onMutate: async (newPrd) => {
      await utils.prd.getByFeature.cancel({ featureRequestId: featureId });
      const prev = utils.prd.getByFeature.getData({ featureRequestId: featureId });
      if (prev) {
        utils.prd.getByFeature.setData({ featureRequestId: featureId }, { ...prev, content: newPrd.content });
      }
      return { prev };
    },
    onSuccess: () => {
      setEditMode(false);
      setSaving(false);
    },
    onError: (err, newPrd, context) => {
      if (context?.prev) utils.prd.getByFeature.setData({ featureRequestId: featureId }, context.prev);
      setSaving(false);
    },
    onSettled: () => utils.prd.getByFeature.invalidate({ featureRequestId: featureId }),
  });

  const approveMutation = trpc.prd.approve.useMutation({
    onMutate: async () => {
      await utils.prd.getByFeature.cancel({ featureRequestId: featureId });
      const prev = utils.prd.getByFeature.getData({ featureRequestId: featureId });
      if (prev) {
        utils.prd.getByFeature.setData({ featureRequestId: featureId }, { ...prev, status: "approved" });
      }
      return { prev };
    },
    onSuccess: () => {
      utils.featureRequest.getById.invalidate({ featureRequestId: featureId });
      router.push(`/project/${projectId}/features/${featureId}/tasks`);
    },
    onError: (err, variables, context) => {
      if (context?.prev) utils.prd.getByFeature.setData({ featureRequestId: featureId }, context.prev);
    },
    onSettled: () => utils.prd.getByFeature.invalidate({ featureRequestId: featureId }),
  });

  const rejectMutation = trpc.prd.reject.useMutation({
    onMutate: async () => {
      await utils.prd.getByFeature.cancel({ featureRequestId: featureId });
      const prev = utils.prd.getByFeature.getData({ featureRequestId: featureId });
      if (prev) {
        utils.prd.getByFeature.setData({ featureRequestId: featureId }, { ...prev, status: "rejected" });
      }
      return { prev };
    },
    onError: (err, variables, context) => {
      if (context?.prev) utils.prd.getByFeature.setData({ featureRequestId: featureId }, context.prev);
    },
    onSettled: () => utils.prd.getByFeature.invalidate({ featureRequestId: featureId }),
  });

  const regenerateMutation = trpc.prd.regenerate.useMutation({
    onSuccess: () => {
      utils.prd.getByFeature.invalidate({ featureRequestId: featureId });
    },
  });

  useEffect(() => {
    if (prd?.content && !editMode) setEditContent(prd.content);
  }, [prd?.content, editMode]);

  const handleSave = () => {
    if (!prd) return;
    setSaving(true);
    updateMutation.mutate({ prdId: prd.id, content: editContent });
  };

  const handleApprove = () => {
    if (!prd) return;
    approveMutation.mutate({ prdId: prd.id });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full gap-0 w-full animate-in fade-in duration-500">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="space-y-2">
            <Skeleton className="w-64 h-6" />
            <Skeleton className="w-32 h-4" />
          </div>
          <Skeleton className="w-32 h-10" />
        </div>
        <div className="p-8 space-y-6 max-w-4xl mx-auto w-full">
          <Skeleton className="w-3/4 h-8" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-5/6 h-4" />
          <Skeleton className="w-1/2 h-8 mt-12" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-4/5 h-4" />
        </div>
      </div>
    );
  }

  if (!prd) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center space-y-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-gray-900 border border-gray-800 flex items-center justify-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-indigo-500/10 animate-pulse" />
          <svg className="w-10 h-10 text-indigo-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl text-white font-semibold">PRD not generated yet</h3>
          <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">Complete the discovery session first to generate a Product Requirements Document.</p>
        </div>
        <button
          onClick={() => router.push(`/project/${projectId}/features/${featureId}/discovery`)}
          className="px-6 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] font-medium"
        >
          Go to Discovery
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-semibold">Product Requirements Document</h1>
              <StatusBadge status={prd.status} />
            </div>
            <p className="text-gray-500 text-xs mt-0.5">v{prd.version} · {feature?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {prd.status !== "approved" && (
            <>
              {editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
                >
                  Edit
                </button>
              )}

              <button
                onClick={() => rejectMutation.mutate({ prdId: prd.id })}
                className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 rounded-lg transition-colors"
              >
                Reject
              </button>

              <button
                onClick={handleApprove}
                disabled={approveMutation.isPending || editMode}
                className="px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {approveMutation.isPending ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve PRD
                  </>
                )}
              </button>

              <button
                onClick={() => regenerateMutation.mutate({ featureRequestId: featureId })}
                disabled={regenerateMutation.isPending}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
                title="Regenerate PRD from discovery"
              >
                ↺ Regenerate
              </button>
            </>
          )}

          {prd.status === "approved" && (
            <button
              onClick={() => router.push(`/project/${projectId}/features/${featureId}/tasks`)}
              className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
            >
              View Tasks →
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {editMode ? (
          // Split: editor | preview
          <>
            <div className="flex-1 border-r border-gray-800">
              <div className="p-2 border-b border-gray-800">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide px-2">Editor</span>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full p-6 bg-transparent text-gray-300 font-mono text-sm resize-none focus:outline-none leading-relaxed"
                placeholder="Write your PRD in Markdown..."
                style={{ minHeight: "calc(100vh - 200px)" }}
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-2 border-b border-gray-800">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide px-2">Preview</span>
              </div>
              <div className="p-6">
                <MarkdownPreview content={editContent} />
              </div>
            </div>
          </>
        ) : (
          // Read-only view
          <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
            <MarkdownPreview content={prd.content} />
          </div>
        )}
      </div>
    </div>
  );
}
