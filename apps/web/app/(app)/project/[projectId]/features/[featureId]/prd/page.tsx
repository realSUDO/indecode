"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { trpc } from "~/trpc/client";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    in_review: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const labels: Record<string, string> = {
    draft: "Draft",
    in_review: "In Review",
    approved: "Approved",
    rejected: "Rejected",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] ?? styles.draft}`}>
      {labels[status] ?? status}
    </span>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  // Simple markdown rendering without a library
  const html = content
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-white mt-6 mb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-medium text-gray-200 mt-4 mb-1">$1</h3>')
    .replace(/^\*\*(.+?)\*\*/gm, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-300">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-300">$2</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '\n');

  return (
    <div
      className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed"
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
  const [approving, setApproving] = useState(false);

  const utils = trpc.useUtils();
  const { data: prd, isLoading } = trpc.prd.getByFeature.useQuery({ featureRequestId: featureId });
  const { data: feature } = trpc.featureRequest.getById.useQuery({ featureRequestId: featureId });

  const updateMutation = trpc.prd.update.useMutation({
    onSuccess: () => {
      utils.prd.getByFeature.invalidate({ featureRequestId: featureId });
      setEditMode(false);
      setSaving(false);
    },
    onError: () => setSaving(false),
  });

  const approveMutation = trpc.prd.approve.useMutation({
    onSuccess: () => {
      utils.prd.getByFeature.invalidate({ featureRequestId: featureId });
      utils.featureRequest.getById.invalidate({ featureRequestId: featureId });
      setApproving(false);
      // Navigate to tasks
      router.push(`/project/${projectId}/features/${featureId}/tasks`);
    },
    onError: () => setApproving(false),
  });

  const rejectMutation = trpc.prd.reject.useMutation({
    onSuccess: () => utils.prd.getByFeature.invalidate({ featureRequestId: featureId }),
  });

  const regenerateMutation = trpc.prd.regenerate.useMutation({
    onSuccess: () => {
      utils.prd.getByFeature.invalidate({ featureRequestId: featureId });
      alert("PRD regeneration started. Refresh in a moment.");
    },
  });

  useEffect(() => {
    if (prd?.content) setEditContent(prd.content);
  }, [prd?.content]);

  const handleSave = () => {
    if (!prd) return;
    setSaving(true);
    updateMutation.mutate({ prdId: prd.id, content: editContent });
  };

  const handleApprove = () => {
    if (!prd) return;
    setApproving(true);
    approveMutation.mutate({ prdId: prd.id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading PRD...</p>
        </div>
      </div>
    );
  }

  if (!prd) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-medium">PRD not generated yet</h3>
          <p className="text-gray-400 text-sm mt-1">Complete the discovery session first.</p>
        </div>
        <button
          onClick={() => router.push(`/project/${projectId}/features/${featureId}/discovery`)}
          className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
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
                disabled={approving || editMode}
                className="px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {approving ? (
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
