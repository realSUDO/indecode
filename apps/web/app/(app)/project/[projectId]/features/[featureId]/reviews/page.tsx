"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, ExternalLink, Loader2, FileCode, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const SEVERITY_STYLES: Record<string, string> = {
  blocking: "bg-white/10 text-white border-white/20",
  high: "bg-white/5 text-neutral-200 border-white/10",
  medium: "bg-transparent text-neutral-400 border-neutral-800",
  low: "bg-transparent text-neutral-500 border-neutral-800",
  suggestion: "bg-transparent text-neutral-500 border-transparent",
};

// Copy button for code blocks
function CodeBlock({ node, inline, className, children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  const onCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-neutral-200" {...props}>{children}</code>;
  }

  return (
    <div className="relative group rounded-xl overflow-hidden border border-white/10 my-6 bg-[#0A0A0A]">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">{language || "Code"}</span>
        <button
          onClick={onCopy}
          className="text-neutral-500 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-neutral-300 leading-relaxed"><code {...props}>{children}</code></pre>
      </div>
    </div>
  );
}

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
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AI Code Review</h1>
          <p className="text-neutral-500 mt-2 flex items-center gap-2">
            Analyzing PR #{pr.prNumber} in <span className="font-mono text-xs px-2 py-1 bg-white/5 rounded-md">{pr.repository.fullName}</span>
          </p>
        </div>
        <button
          onClick={() => window.open(`https://github.com/${pr.repository.fullName}/pull/${pr.prNumber}`, '_blank')}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors border border-white/10 flex items-center gap-2"
        >
          View PR <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {!latestReview ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
          </div>
          <h2 className="text-lg font-medium text-white mb-2">Analysis in Progress</h2>
          <p className="text-neutral-500 max-w-sm">
            The AI is analyzing your pull request against the PRD and Tasks. This takes about a minute.
          </p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
          
          {/* Review Summary */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-semibold text-white">Summary</h2>
              <span className={`px-2.5 py-0.5 text-xs font-mono uppercase tracking-wider rounded border ${
                latestReview.overallVerdict === "approved" ? "bg-white/10 text-white border-white/20" :
                latestReview.overallVerdict === "changes_required" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                "bg-white/5 text-neutral-300 border-white/10"
              }`}>
                {latestReview.overallVerdict.replace("_", " ")}
              </span>
            </div>
            <div className="prose prose-invert prose-neutral max-w-none prose-p:leading-relaxed prose-headings:font-semibold text-neutral-300">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code: CodeBlock,
                  a: ({node, ...props}) => <a className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white transition-colors" {...props} />,
                  h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-8 mb-4 text-white" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-8 mb-4 text-white" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-6 mb-3 text-white" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-6 space-y-2 marker:text-neutral-600" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-6 space-y-2 marker:text-neutral-600" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-white/20 pl-4 py-1 italic text-neutral-400 my-6 bg-white/5 pr-4 rounded-r-lg" {...props} />,
                  table: ({node, ...props}) => <div className="overflow-x-auto my-6 border border-white/10 rounded-xl"><table className="w-full text-left border-collapse" {...props} /></div>,
                  th: ({node, ...props}) => <th className="border-b border-white/10 py-3 px-4 font-medium text-white bg-white/5" {...props} />,
                  td: ({node, ...props}) => <td className="border-b border-white/5 py-3 px-4 text-neutral-300" {...props} />,
                }}
              >
                {latestReview.summary}
              </ReactMarkdown>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Issues List */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">Detailed Feedback</h2>
            
            {latestReview.issues && latestReview.issues.length > 0 ? (
              <div className="space-y-6">
                {latestReview.issues.map((issue: any, i: number) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={issue.id} 
                    className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border ${SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.medium}`}>
                          {issue.severity}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-mono bg-white/5 px-2 py-1 rounded">
                          <FileCode className="w-3.5 h-3.5" />
                          {issue.filePath}{issue.lineNumber ? `:${issue.lineNumber}` : ''}
                        </div>
                      </div>
                      
                      <h4 className="text-lg font-medium text-white mb-3">{issue.title}</h4>
                      
                      <div className="prose prose-invert prose-neutral max-w-none text-neutral-400 text-sm">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{ code: CodeBlock }}
                        >
                          {issue.description}
                        </ReactMarkdown>
                      </div>
                    </div>
                    
                    {issue.suggestion && (
                      <div className="border-t border-white/10 bg-white/[0.02] p-6">
                        <div className="text-xs text-neutral-500 uppercase tracking-wider font-mono mb-3">Suggested Fix</div>
                        <div className="prose prose-invert max-w-none">
                           <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{ code: CodeBlock }}
                          >
                            {issue.suggestion}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-white" />
                <div>
                  <h3 className="text-white font-medium">Looks good!</h3>
                  <p className="text-neutral-500 text-sm mt-1">No specific issues were identified in the codebase.</p>
                </div>
              </div>
            )}
          </div>

          {/* Continue Action */}
          <div className="flex justify-end pt-8">
            <button
              onClick={() => router.push(`/project/${projectId}/features/${featureId}/release`)}
              className="px-6 py-3 bg-white text-black hover:bg-neutral-200 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              Continue to Release
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
