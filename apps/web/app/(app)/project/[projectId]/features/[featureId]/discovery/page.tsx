"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Loader2, ArrowLeft, Send, CheckCircle2, Bot, User } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ModelBadge } from "~/components/ui/model-badge";
import { Textarea } from "~/components/ui/textarea";

export default function DiscoveryPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const featureId = params.featureId as string;

  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const { data: session, isLoading: sessionLoading } = trpc.discovery.getSession.useQuery({
    featureRequestId: featureId,
  });

  const { data: feature } = trpc.featureRequest.getById.useQuery({
    featureRequestId: featureId,
  });

  const initializeMutation = trpc.discovery.initialize.useMutation({
    onSuccess: () => {
      utils.discovery.getSession.invalidate({ featureRequestId: featureId });
    },
  });

  const sendMessageMutation = trpc.discovery.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      utils.discovery.getSession.invalidate({ featureRequestId: featureId });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send message");
    },
  });

  const completeMutation = trpc.discovery.complete.useMutation({
    onSuccess: () => {
      utils.featureRequest.getById.invalidate({ featureRequestId: featureId });
      toast.success("Discovery completed! PRD generation will begin shortly.");
      router.push(`/project/${projectId}/features/${featureId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to complete discovery");
    },
  });

  // Auto-initialize session with first AI message
  useEffect(() => {
    if (session && session.messages.length === 0 && session.status === "active" && !initializeMutation.isPending) {
      initializeMutation.mutate({ featureRequestId: featureId });
    }
  }, [session, featureId, initializeMutation]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

  const handleSend = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate({
      featureRequestId: featureId,
      message: message.trim(),
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button variant="ghost" className="mb-6" onClick={() => router.push(`/project/${projectId}/features/${featureId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feature
        </Button>
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Discovery session is being created...</p>
          <p className="text-sm text-muted-foreground mt-2">This may take a moment if the Inngest worker is starting up.</p>
        </Card>
      </div>
    );
  }

  const isCompleted = session.status === "completed";

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10" onClick={() => router.push(`/project/${projectId}/features/${featureId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-sm text-white">{feature?.title || "Discovery"}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={isCompleted ? "bg-green-500/10 text-green-500" : "bg-purple-500/10 text-purple-500"}>
                {isCompleted ? "Completed" : "Active"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {session.messages.length} messages
              </span>
              <ModelBadge />
            </div>
          </div>
        </div>
        {!isCompleted && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => completeMutation.mutate({ featureRequestId: featureId })}
            disabled={completeMutation.isPending || session.messages.length < 2}
          >
            {completeMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Complete Discovery
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8 scroll-smooth w-full">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
          {initializeMutation.isPending && session.messages.length === 0 && (
            <div className="flex gap-6 animate-pulse">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg">
                <Bot className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-3 text-indigo-400/70 font-medium text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing your feature request...</span>
                </div>
              </div>
            </div>
          )}

          {session.messages.map((msg: any) => (
            <div key={msg.id} className="flex gap-6">
              <div className="flex-shrink-0 w-12">
                {msg.role === "user" ? (
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ml-2 shadow-lg">
                    <User className="w-5 h-5 text-neutral-400" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                    <Bot className="w-6 h-6 text-indigo-400" />
                  </div>
                )}
              </div>
              <div className={`flex-1 text-neutral-300 pt-1`}>
                <div className={`${msg.role === "user" ? "bg-white/5 px-5 py-4 rounded-3xl rounded-tl-sm border border-white/5 inline-block max-w-[85%]" : ""}`}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({node, ...props}) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-6 text-white" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-4 mt-6 text-white" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-bold mb-4 mt-6 text-white" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                    code: ({node, className, children, ...props}: any) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const isInline = !match && !className;
                      return isInline ? (
                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-neutral-200" {...props}>{children}</code>
                      ) : (
                        <pre className="bg-[#0A0A0A] border border-white/10 p-4 rounded-lg overflow-x-auto mb-4 mt-2">
                          <code className="text-sm font-mono text-neutral-300" {...props}>{children}</code>
                        </pre>
                      );
                    },
                    blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-white/20 pl-4 italic text-neutral-400 mb-4" {...props} />,
                    table: ({node, ...props}) => <div className="overflow-x-auto mb-4"><table className="w-full text-left border-collapse" {...props} /></div>,
                    th: ({node, ...props}) => <th className="border-b border-white/10 py-2 px-4 font-semibold text-white bg-white/5" {...props} />,
                    td: ({node, ...props}) => <td className="border-b border-white/5 py-2 px-4" {...props} />,
                  }}
                >
                  {msg.content}
                  </ReactMarkdown>
                  <div className={`text-[10px] text-neutral-500 mt-3 font-medium tracking-wide ${msg.role === "user" ? "opacity-70" : ""}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {sendMessageMutation.isPending && (
            <div className="flex gap-6 animate-pulse">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg">
                <Bot className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-3 text-indigo-400/70 font-medium text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input */}
      {!isCompleted && (
        <div className="sticky bottom-0 bg-gradient-to-t from-[#0E0E11] via-[#0E0E11] to-transparent pt-10 pb-6 px-4 z-10 w-full">
          <div className="max-w-3xl mx-auto relative group">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message Indecode AI... (Shift+Enter for newline)"
              disabled={sendMessageMutation.isPending || initializeMutation.isPending}
              className="min-h-[60px] max-h-[200px] resize-none pr-14 pl-5 py-4 bg-[#141416] border border-white/10 hover:border-white/20 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 rounded-2xl shadow-2xl transition-all"
              rows={1}
            />
            <Button
              onClick={handleSend}
              size="icon"
              disabled={!message.trim() || sendMessageMutation.isPending || initializeMutation.isPending}
              className="absolute right-2 bottom-2 h-10 w-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:bg-white/10 disabled:text-white/30"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
