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
  }, [session]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate({
      featureRequestId: featureId,
      message: message.trim(),
    });
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
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/project/${projectId}/features/${featureId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-sm">{feature?.title || "Discovery"}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={isCompleted ? "bg-green-500/10 text-green-500" : "bg-purple-500/10 text-purple-500"}>
                {isCompleted ? "Completed" : "Active"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {session.messages.length} messages
              </span>
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
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {initializeMutation.isPending && session.messages.length === 0 && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 bg-muted rounded-lg rounded-tl-none px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">AI is analyzing your feature request...</span>
              </div>
            </div>
          </div>
        )}

        {session.messages.map((msg: any) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              msg.role === "user" ? "bg-blue-500/10" : "bg-primary/10"
            }`}>
              {msg.role === "user" ? (
                <User className="w-4 h-4 text-blue-500" />
              ) : (
                <Bot className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className={`flex-1 max-w-[80%] rounded-lg px-4 py-3 ${
              msg.role === "user"
                ? "bg-blue-500/10 rounded-tr-none ml-auto"
                : "bg-muted rounded-tl-none"
            }`}>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              <div className="text-xs text-muted-foreground mt-2">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {sendMessageMutation.isPending && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 bg-muted rounded-lg rounded-tl-none px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isCompleted && (
        <div className="border-t px-4 py-3">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your response..."
              disabled={sendMessageMutation.isPending || initializeMutation.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || sendMessageMutation.isPending || initializeMutation.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
