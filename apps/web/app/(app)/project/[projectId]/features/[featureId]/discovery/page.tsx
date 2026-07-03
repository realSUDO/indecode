"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Loader2, ArrowLeft, ChevronRight, CheckCircle2, User } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";

import { ModelBadge } from "~/components/ui/model-badge";

const PenAvatar = ({ className, isAnimating = false }: { className?: string, isAnimating?: boolean }) => (
  <svg className={className} viewBox="210 70 260 260" xmlns="http://www.w3.org/2000/svg">
    <title>Animated pen avatar</title>
    <desc>A circular avatar with a pen icon that tilts as if writing</desc>
    <style>{`
      .pen-bg { fill: #0B0B0B; }
      .pen-icon { transform-origin: 340px 200px; ${isAnimating ? "animation: write 2.4s ease-in-out infinite;" : ""} }
      .pen-trace { ${isAnimating ? "stroke-dasharray: 220; animation: draw 2.4s ease-in-out infinite;" : "opacity: 0;"} }
      @keyframes write {
        0% { transform: rotate(-6deg) translate(-10px, 4px); }
        50% { transform: rotate(6deg) translate(10px, -4px); }
        100% { transform: rotate(-6deg) translate(-10px, 4px); }
      }
      @keyframes draw {
        0% { stroke-dashoffset: 220; opacity: 0; }
        15% { opacity: 0.9; }
        85% { opacity: 0.9; }
        100% { stroke-dashoffset: 0; opacity: 0; }
      }
    `}</style>
    <circle className="pen-bg" cx="340" cy="200" r="130"/>
    <path className="pen-trace" d="M270 250 Q300 220, 320 245 T360 240 T400 250" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
    <g className="pen-icon">
      <rect x="330" y="130" width="20" height="90" rx="8" fill="#FFFFFF"/>
      <path d="M330 220 L340 245 L350 220 Z" fill="#FFFFFF"/>
      <rect x="330" y="150" width="20" height="10" fill="#0B0B0B" opacity="0.35"/>
    </g>
  </svg>
);

export default function DiscoveryPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const featureId = params.featureId as string;

  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputHeight, setInputHeight] = useState(56);

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
      const scrollHeight = textareaRef.current.scrollHeight;
      setInputHeight(Math.min(scrollHeight, 128));
    }
  };

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
    <div className="absolute inset-0 top-14 flex flex-col bg-background z-20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => router.push(`/project/${projectId}/features/${featureId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-sm text-foreground">{feature?.title || "Discovery"}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={isCompleted ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-muted text-muted-foreground hover:bg-muted"}>
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
            variant="secondary"
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
      <div className="flex-1 overflow-y-auto px-4 py-8 scroll-smooth w-full relative">
        <div className="max-w-4xl mx-auto space-y-8 pb-32">
          {initializeMutation.isPending && session.messages.length === 0 && (
            <div className="flex gap-4 animate-pulse">
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                <PenAvatar className="w-10 h-10 rounded-full shadow-sm" isAnimating />
              </div>
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-3 text-muted-foreground font-medium text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing your feature request...</span>
                </div>
              </div>
            </div>
          )}

          {session.messages.map((msg: any) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className="flex-shrink-0 w-10">
                {msg.role === "user" ? (
                  <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center shadow-sm">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center">
                    <PenAvatar className="w-10 h-10 rounded-full shadow-sm" isAnimating={false} />
                  </div>
                )}
              </div>
              <div className={`flex-1 flex ${msg.role === "user" ? "justify-end" : "justify-start"} pt-1`}>
                <div className={`${msg.role === "user" ? "bg-zinc-200 text-zinc-900 px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-sm inline-block max-w-[85%]" : "text-foreground w-full max-w-[90%]"}`}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-2xl font-semibold mb-4 mt-6" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-4 mt-6" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-4 mt-6" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
                      li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                      code: ({node, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match && !className;
                        return isInline ? (
                          <code className={`${msg.role === 'user' ? 'bg-zinc-300/60 text-zinc-900' : 'bg-muted text-muted-foreground'} px-1.5 py-0.5 rounded-md text-sm font-mono`} {...props}>{children}</code>
                        ) : (
                          <pre className="bg-zinc-950 border border-border p-4 rounded-xl overflow-x-auto mb-4 mt-2">
                            <code className="text-sm font-mono text-zinc-300" {...props}>{children}</code>
                          </pre>
                        );
                      },
                      blockquote: ({node, ...props}) => <blockquote className={`border-l-4 ${msg.role === 'user' ? 'border-zinc-400 text-zinc-700' : 'border-border text-muted-foreground'} pl-4 italic mb-4`} {...props} />,
                      table: ({node, ...props}) => <div className="overflow-x-auto mb-4 border border-border rounded-lg"><table className="w-full text-left border-collapse" {...props} /></div>,
                      th: ({node, ...props}) => <th className={`border-b ${msg.role === 'user' ? 'border-zinc-300 bg-zinc-300/30' : 'border-border bg-muted/50'} py-3 px-4 font-semibold text-sm`} {...props} />,
                      td: ({node, ...props}) => <td className={`border-b ${msg.role === 'user' ? 'border-zinc-300/50' : 'border-border'} py-3 px-4 text-sm`} {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  <div className={`text-[10px] mt-2 font-medium tracking-wide ${msg.role === "user" ? "text-zinc-500 text-right" : "text-muted-foreground"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {sendMessageMutation.isPending && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                <PenAvatar className="w-10 h-10 rounded-full shadow-sm" isAnimating />
              </div>
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-3 text-muted-foreground font-medium text-sm">
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
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-12 pb-6 px-4 z-10">
          <div className="max-w-3xl mx-auto relative group flex items-end gap-2">
            <motion.textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => { setMessage(e.target.value); handleInput(); }}
              onKeyDown={onKeyDown}
              animate={{ height: inputHeight }}
              initial={{ height: 56 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              placeholder="Message Indecode AI... (Shift+Enter for newline)"
              disabled={sendMessageMutation.isPending || initializeMutation.isPending}
              className="w-full resize-none pr-14 pl-5 py-4 bg-background border border-border hover:border-border/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-2xl shadow-sm text-base text-foreground placeholder:text-muted-foreground [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
              rows={1}
            />
            <Button
              onClick={handleSend}
              size="icon"
              disabled={!message.trim() || sendMessageMutation.isPending || initializeMutation.isPending}
              className="absolute right-2 bottom-2 h-10 w-10 rounded-xl shadow-sm transition-all duration-300 active:scale-95 bg-white text-black hover:bg-zinc-200"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
