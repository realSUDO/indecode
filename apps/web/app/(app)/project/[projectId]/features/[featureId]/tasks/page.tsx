"use client";

import { useParams, useRouter } from "next/navigation";
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
  const router = useRouter();
  const featureId = params.featureId as string;
  const projectId = params.projectId as string;
  const utils = trpc.useUtils();

  const { data: feature } = trpc.featureRequest.getById.useQuery({ featureRequestId: featureId });
  
  // Intelligent polling: poll fast (2s) if implementing or planning, otherwise longer or disabled
  const isGenerating = feature?.status === "planning";
  const isImplementing = feature?.status === "implementing";
  const shouldPoll = isGenerating || isImplementing;

  const { data: taskList, isLoading } = trpc.task.listByFeature.useQuery(
    { featureRequestId: featureId },
    // Always poll while implementing or planning; slow poll otherwise
    { refetchInterval: (shouldPoll || isImplementing) ? 2000 : 10000 }
  );

  const implementMutation = trpc.featureRequest.triggerImplementation.useMutation({
    onSuccess: () => {
      // Immediately redirect to the timeline view so user sees live progress
      utils.featureRequest.getById.invalidate({ featureRequestId: featureId });
      router.push(`/project/${projectId}/features/${featureId}`);
    },
  });

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
  const todoTasks = sortedTasks.filter(t => t.status === "todo");
  const inProgressTasks = sortedTasks.filter(t => t.status === "in_progress");
  const doneTasks = sortedTasks.filter(t => t.status === "done");

  const renderTaskCard = (task: Task, index: number) => {
    const isDone = task.status === "done";
    const isInProgress = task.status === "in_progress";
    const isTodo = task.status === "todo";

    return (
      <motion.div
        layout
        key={task.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`relative overflow-hidden rounded-xl border transition-all duration-500 ${
          isInProgress 
            ? "border-white/20 bg-white/5 shadow-2xl" 
            : isDone
            ? "border-white/5 bg-transparent opacity-60"
            : "border-white/5 bg-[#0A0A0A]"
        }`}
      >
        {isInProgress && (
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent z-0"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
        )}

        <div className="relative z-10 p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex-shrink-0">
              {isDone && <CheckCircle2 className="w-4 h-4 text-neutral-400" />}
              {isInProgress && <PlayCircle className="w-4 h-4 text-white animate-pulse" />}
              {isTodo && <Circle className="w-4 h-4 text-neutral-600" />}
            </div>
            <div>
              <h3 className={`font-medium text-sm transition-colors duration-300 ${
                isDone ? "text-neutral-400 line-through decoration-neutral-600" : "text-white"
              }`}>
                {task.title}
              </h3>
            </div>
          </div>
          
          {task.description && (
            <p className="text-neutral-500 text-xs leading-relaxed line-clamp-3">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-auto pt-2">
            {task.priority && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/10 text-neutral-400 bg-white/5">
                {task.priority}
              </span>
            )}
            {task.complexity && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/10 text-neutral-400 bg-white/5">
                {task.complexity}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-12">
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
            {implementMutation.isPending ? "Starting AI Agent..." : "Implement with AI"}
          </button>
        )}
      </div>

      {/* Task Kanban */}
      {!taskList || taskList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <div className="w-8 h-8 border-2 border-dashed border-neutral-600 rounded-full" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No tasks generated yet</h3>
          <p className="text-neutral-500 max-w-sm">
            Approve the PRD to trigger the AI planning phase, which will break down the work into tasks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Todo Column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">To Do</h3>
              <span className="text-xs bg-white/10 text-white px-2 py-0.5 rounded-full">{todoTasks.length}</span>
            </div>
            <div className="flex flex-col gap-3 min-h-[200px]">
              <AnimatePresence>
                {todoTasks.map((task, i) => renderTaskCard(task, i))}
              </AnimatePresence>
              {todoTasks.length === 0 && (
                <div className="py-8 text-center text-neutral-600 text-sm border border-dashed border-white/5 rounded-xl">
                  No tasks
                </div>
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">In Progress</h3>
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{inProgressTasks.length}</span>
            </div>
            <div className="flex flex-col gap-3 min-h-[200px]">
              <AnimatePresence>
                {inProgressTasks.map((task, i) => renderTaskCard(task, i))}
              </AnimatePresence>
              {inProgressTasks.length === 0 && (
                <div className="py-8 text-center text-neutral-600 text-sm border border-dashed border-white/5 rounded-xl">
                  No tasks
                </div>
              )}
            </div>
          </div>

          {/* Done Column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Done</h3>
              <span className="text-xs bg-white/10 text-white px-2 py-0.5 rounded-full">{doneTasks.length}</span>
            </div>
            <div className="flex flex-col gap-3 min-h-[200px]">
              <AnimatePresence>
                {doneTasks.map((task, i) => renderTaskCard(task, i))}
              </AnimatePresence>
              {doneTasks.length === 0 && (
                <div className="py-8 text-center text-neutral-600 text-sm border border-dashed border-white/5 rounded-xl">
                  No tasks
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
