"use client";

import { useParams } from "next/navigation";
import { trpc } from "~/trpc/client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, PlayCircle, Loader2 } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  complexity: string | null;
  sortOrder: number;
};

export default function TasksPage() {
  const params = useParams();
  const featureId = params.featureId as string;

  const { data: feature } = trpc.featureRequest.getById.useQuery({ featureRequestId: featureId });
  
  // Intelligent polling: poll fast (2s) if implementing or planning, otherwise longer or disabled
  const isGenerating = feature?.status === "planning";
  const isImplementing = feature?.status === "implementing";
  const shouldPoll = isGenerating || isImplementing;

  const { data: taskList, isLoading } = trpc.task.listByFeature.useQuery(
    { featureRequestId: featureId },
    { refetchInterval: shouldPoll ? 2000 : 10000 }
  );

  const implementMutation = trpc.featureRequest.triggerImplementation.useMutation();

  if (isLoading && !taskList) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-neutral-500 animate-spin mx-auto" />
          <p className="text-neutral-500 text-sm">Loading tasks...</p>
        </div>
      </div>
    );
  }

  const sortedTasks = [...(taskList || [])].sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Implementation Tasks</h1>
          <p className="text-neutral-500 mt-2">{feature?.title}</p>
        </div>
        
        {feature?.status === "planning" && (
          <div className="flex items-center gap-2 text-neutral-400 bg-white/5 px-4 py-2 rounded-full text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating tasks...
          </div>
        )}

        {feature?.status === "in_progress" && (
          <button 
            onClick={() => implementMutation.mutate({ featureRequestId: featureId })}
            disabled={implementMutation.isPending}
            className="px-6 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
          >
            {implementMutation.isPending ? "Starting AI Agent..." : "Implement with AI ✨"}
          </button>
        )}
      </div>

      {/* Task List */}
      {!taskList || taskList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <div className="w-8 h-8 border-2 border-dashed border-neutral-600 rounded-full" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No tasks generated yet</h3>
          <p className="text-neutral-500 max-w-sm">
            Approve the PRD to trigger the AI planning phase, which will break down the work into tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {sortedTasks.map((task: Task, index: number) => {
              const isDone = task.status === "done";
              const isInProgress = task.status === "in_progress";
              const isTodo = task.status === "todo";

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={\`relative overflow-hidden rounded-xl border transition-all duration-500 \${
                    isInProgress 
                      ? "border-white/20 bg-white/5 shadow-2xl" 
                      : isDone
                      ? "border-white/5 bg-transparent opacity-60"
                      : "border-white/5 bg-[#0A0A0A]"
                  }\`}
                >
                  {/* Subtle pulsing background for active task */}
                  {isInProgress && (
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent z-0"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    />
                  )}

                  <div className="relative z-10 p-5 flex items-start gap-4">
                    <div className="mt-0.5 flex-shrink-0">
                      {isDone && <CheckCircle2 className="w-5 h-5 text-neutral-400" />}
                      {isInProgress && <PlayCircle className="w-5 h-5 text-white animate-pulse" />}
                      {isTodo && <Circle className="w-5 h-5 text-neutral-600" />}
                    </div>

                    <div className="flex-1">
                      <h3 className={\`font-medium text-base transition-colors duration-300 \${
                        isDone ? "text-neutral-400 line-through decoration-neutral-600" : "text-white"
                      }\`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-neutral-500 text-sm mt-1.5 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-3">
                        {task.priority && (
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 text-neutral-400 bg-white/5">
                            {task.priority}
                          </span>
                        )}
                        {task.complexity && (
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 text-neutral-400 bg-white/5">
                            {task.complexity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
