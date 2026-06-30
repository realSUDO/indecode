"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Check, Loader2, Play } from "lucide-react";
import React from "react";

type Stage = {
  key: string;
  label: string;
  activeFor: string[];
  noRedirect?: boolean;
};

export const STAGES: Stage[] = [
  { key: "discovery", label: "Discovery", activeFor: ["submitted", "discovery"] },
  { key: "prd", label: "PRD", activeFor: ["prd_draft", "prd_approved"] },
  { key: "tasks", label: "Task list", activeFor: ["planning", "in_progress"] },
  { key: "tasks", label: "Implement", activeFor: ["implementing"], noRedirect: true },
  { key: "reviews", label: "Review", activeFor: ["review"] },
  { key: "release", label: "Ship", activeFor: ["shipped"] },
];

const STATUS_ORDER = [
  "submitted", 
  "discovery", 
  "prd_draft", 
  "prd_approved", 
  "planning", 
  "in_progress", 
  "implementing",
  "review", 
  "shipped"
];

export function ExecutionTimeline({ 
  currentStatus, 
  projectId, 
  featureId 
}: { 
  currentStatus: string;
  projectId: string;
  featureId: string;
}) {
  const router = useRouter();
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);

  let activeStageIndex = 0;
  for (let i = STAGES.length - 1; i >= 0; i--) {
    const stage = STAGES[i]!;
    const minStatusForStageIdx = Math.min(...stage.activeFor.map(s => STATUS_ORDER.indexOf(s)));
    if (currentIdx >= minStatusForStageIdx) {
      activeStageIndex = i;
      break;
    }
  }

  // Calculate SVG dimensions
  const width = 800;
  const height = 120;
  const padding = 40;
  const usableWidth = width - padding * 2;
  const gap = usableWidth / (STAGES.length - 1);
  const activeWidth = (activeStageIndex / (STAGES.length - 1)) * usableWidth;

  return (
    <div className="w-full py-12 flex justify-center overflow-x-auto no-scrollbar">
      <div className="relative w-[800px] h-[120px] shrink-0">
        <svg width={width} height={height} className="absolute inset-0 overflow-visible">
          <defs>
            <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
            </linearGradient>
            
            <linearGradient id="activeLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            <filter id="blur-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track */}
          <line 
            x1={padding} 
            y1={height / 2} 
            x2={width - padding} 
            y2={height / 2} 
            stroke="#171717" 
            strokeWidth="4" 
            strokeLinecap="round" 
          />

          {/* Animated Active Track */}
          <motion.line 
            x1={padding} 
            y1={height / 2} 
            x2={padding + activeWidth} 
            y2={height / 2} 
            stroke="url(#activeLine)" 
            strokeWidth="4" 
            strokeLinecap="round"
            initial={{ x2: padding }}
            animate={{ x2: padding + activeWidth }}
            transition={{ duration: 1, ease: "easeInOut" }}
            filter="url(#blur-glow)"
          />
        </svg>

        {/* Nodes and Labels */}
        <div className="absolute inset-0 flex items-center justify-between" style={{ padding: `0 ${padding}px` }}>
          {STAGES.map((stage, i) => {
            const isCompleted = i < activeStageIndex;
            const isActive = i === activeStageIndex;
            const isFuture = i > activeStageIndex;
            
            // Only allow clicking active or past stages
            const isClickable = (!isFuture || isActive) && !stage.noRedirect;

            return (
              <div 
                key={stage.label + i}
                className={`relative flex flex-col items-center justify-center -mt-[2px] ${isClickable ? 'cursor-pointer' : stage.noRedirect && isCompleted ? 'cursor-help' : 'cursor-not-allowed opacity-50'} group`}
                onClick={() => {
                  if (isClickable) {
                    router.push(`/project/${projectId}/features/${featureId}/${stage.key}`);
                  }
                }}
              >
                {/* Tooltip for completed non-redirectable stages */}
                {stage.noRedirect && isCompleted && (
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black text-xs font-semibold px-2 py-1 rounded whitespace-nowrap z-50 shadow-xl pointer-events-none">
                    Implemented!
                  </div>
                )}
                {/* Node circle */}
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.15 }}
                  className="relative z-10 flex items-center justify-center w-8 h-8"
                >
                  {/* Glowing aura for active */}
                  {isActive && (
                    <motion.div 
                      className="absolute inset-[-8px] rounded-full bg-white/20 blur-sm"
                      animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    />
                  )}

                  <div className={`relative z-10 w-full h-full rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                    isCompleted ? "bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.5)]" :
                    isActive ? "bg-black border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.3)]" :
                    "bg-black border-neutral-800 text-neutral-600"
                  }`}>
                    {isCompleted && <Check className="w-4 h-4" strokeWidth={3} />}
                    {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isFuture && <div className="w-2 h-2 rounded-full bg-neutral-800" />}
                  </div>
                </motion.div>

                {/* Label */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 + 0.1 }}
                  className="absolute top-10 flex flex-col items-center whitespace-nowrap"
                >
                  <span className={`text-[13px] font-semibold tracking-wide uppercase transition-colors duration-500 ${
                    isActive ? "text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" :
                    isCompleted ? "text-neutral-300" :
                    "text-neutral-600"
                  }`}>
                    {stage.label}
                  </span>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
