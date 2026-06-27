"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { trpc } from "~/trpc/client";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  complexity: string | null;
  sortOrder: number;
};

type Status = "todo" | "in_progress" | "done";

const COLUMNS: { id: Status; label: string; color: string; dotColor: string }[] = [
  { id: "todo", label: "To Do", color: "bg-gray-800/50 border-gray-700/50", dotColor: "bg-gray-500" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-950/30 border-blue-800/30", dotColor: "bg-blue-400" },
  { id: "done", label: "Done", color: "bg-emerald-950/30 border-emerald-800/30", dotColor: "bg-emerald-400" },
];

const PRIORITY_BADGES: Record<string, string> = {
  low: "bg-gray-700 text-gray-400",
  medium: "bg-blue-900/50 text-blue-400",
  high: "bg-orange-900/50 text-orange-400",
  critical: "bg-red-900/50 text-red-400",
};

const COMPLEXITY_BADGES: Record<string, string> = {
  trivial: "bg-gray-700 text-gray-400",
  small: "bg-cyan-900/50 text-cyan-400",
  medium: "bg-indigo-900/50 text-indigo-400",
  large: "bg-purple-900/50 text-purple-400",
  complex: "bg-pink-900/50 text-pink-400",
};

function TaskCard({
  task,
  onDragStart,
  onStatusChange,
}: {
  task: Task;
  onDragStart: (task: Task) => void;
  onStatusChange: (taskId: string, status: Status) => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      className="group bg-gray-900 border border-gray-700/60 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-gray-600 transition-all duration-150 hover:shadow-lg hover:shadow-black/30"
    >
      <p className="text-white text-sm font-medium leading-snug">{task.title}</p>

      {task.description && (
        <p className="text-gray-500 text-xs mt-2 leading-relaxed line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        {task.priority && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGES[task.priority] ?? PRIORITY_BADGES.medium}`}>
            {task.priority}
          </span>
        )}
        {task.complexity && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COMPLEXITY_BADGES[task.complexity] ?? COMPLEXITY_BADGES.medium}`}>
            {task.complexity}
          </span>
        )}
      </div>

      {/* Quick status change */}
      <div className="mt-3 pt-3 border-t border-gray-800 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {COLUMNS.filter(c => c.id !== task.status).map(col => (
          <button
            key={col.id}
            onClick={() => onStatusChange(task.id, col.id)}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
          >
            → {col.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  onDragOver,
  onDrop,
  onDragStart,
  onStatusChange,
}: {
  column: typeof COLUMNS[number];
  tasks: Task[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: Status) => void;
  onDragStart: (task: Task) => void;
  onStatusChange: (taskId: string, status: Status) => void;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-4 min-h-[400px] transition-colors ${column.color}`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${column.dotColor}`} />
        <h3 className="text-white font-medium text-sm">{column.label}</h3>
        <span className="ml-auto text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onStatusChange={onStatusChange}
          />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-700/40 rounded-xl">
            <p className="text-gray-600 text-sm">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const params = useParams();
  const featureId = params.featureId as string;

  const [draggingTask, setDraggingTask] = useState<Task | null>(null);

  const utils = trpc.useUtils();
  const { data: taskList, isLoading } = trpc.task.listByFeature.useQuery(
    { featureRequestId: featureId },
    { refetchInterval: 5000 } // poll every 5s while tasks generate
  );
  const { data: feature } = trpc.featureRequest.getById.useQuery({ featureRequestId: featureId });

  const reorderMutation = trpc.task.reorder.useMutation({
    onSuccess: () => utils.task.listByFeature.invalidate({ featureRequestId: featureId }),
  });

  const implementMutation = trpc.featureRequest.triggerImplementation.useMutation();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: Status) => {
    e.preventDefault();
    if (!draggingTask) return;
    if (draggingTask.status === targetStatus) return;

    // Optimistic update
    reorderMutation.mutate({
      taskId: draggingTask.id,
      newSortOrder: draggingTask.sortOrder,
      newStatus: targetStatus,
    });
    setDraggingTask(null);
  };

  const handleStatusChange = (taskId: string, status: Status) => {
    const task = taskList?.find(t => t.id === taskId);
    if (!task) return;
    reorderMutation.mutate({ taskId, newSortOrder: task.sortOrder, newStatus: status });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading tasks...</p>
        </div>
      </div>
    );
  }

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = (taskList ?? []).filter(t => t.status === col.id);
    return acc;
  }, {} as Record<Status, Task[]>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-semibold text-lg">Engineering Tasks</h1>
          <p className="text-gray-500 text-sm mt-0.5">{feature?.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm">{taskList?.length ?? 0} tasks total</span>
          <div className="flex items-center gap-1.5">
            {COLUMNS.map(col => (
              <div key={col.id} className="flex items-center gap-1 text-xs text-gray-500">
                <div className={`w-1.5 h-1.5 rounded-full ${col.dotColor}`} />
                {tasksByStatus[col.id]?.length ?? 0}
              </div>
            ))}
          </div>
          <button 
            onClick={() => implementMutation.mutate({ featureRequestId: featureId })}
            disabled={implementMutation.isPending || implementMutation.isSuccess}
            className={`ml-4 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              implementMutation.isSuccess 
                ? "bg-emerald-600 hover:bg-emerald-500" 
                : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {implementMutation.isPending 
              ? "Starting AI..." 
              : implementMutation.isSuccess 
                ? "AI Implementing... Check GitHub! 🚀" 
                : "Implement with AI ✨"}
          </button>
        </div>
      </div>

      {/* No tasks yet */}
      {!taskList || taskList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-medium">No tasks yet</h3>
            <p className="text-gray-500 text-sm mt-1">
              {feature?.status === "planning"
                ? "Tasks are being generated... Refresh in a moment."
                : "Approve the PRD first to generate engineering tasks."}
            </p>
          </div>
          {feature?.status === "planning" && (
            <div className="flex items-center gap-2 text-indigo-400 text-sm">
              <div className="w-4 h-4 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
              AI is generating tasks...
            </div>
          )}
        </div>
      ) : (
        // Kanban Board
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasksByStatus[col.id] ?? []}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragStart={setDraggingTask}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
