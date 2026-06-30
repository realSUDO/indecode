"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

type Stage = {
  key: string;
  label: string;
  activeFor: string[];
};

export const STAGES: Stage[] = [
  { key: "discovery", label: "prd", activeFor: ["submitted", "discovery", "prd_draft", "prd_approved"] }, // we call it prd in UI to match the picture
  { key: "tasks", label: "Task list", activeFor: ["planning", "in_progress"] },
  { key: "tasks", label: "Implement", activeFor: ["implementing"] },
  { key: "reviews", label: "Review", activeFor: ["review"] },
  { key: "release", label: "Ship", activeFor: ["shipped"] },
];

// Order of statuses in the backend to determine progress
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

  // Calculate which stage we are actually in based on STATUS_ORDER and activeFor
  let activeStageIndex = 0;
  for (let i = STAGES.length - 1; i >= 0; i--) {
    const stage = STAGES[i];
    const maxStatusForStageIdx = Math.max(...stage.activeFor.map(s => STATUS_ORDER.indexOf(s)));
    
    // If the current status is equal or past the start of this stage
    const minStatusForStageIdx = Math.min(...stage.activeFor.map(s => STATUS_ORDER.indexOf(s)));
    
    if (currentIdx >= minStatusForStageIdx) {
      activeStageIndex = i;
      break;
    }
  }

  // Determine visibility: show up to the active stage + 1 (the immediate next one if available)
  const visibleStages = STAGES.slice(0, activeStageIndex + 2);

  return (
    <div className="w-full py-8">
      <div className="relative flex items-center justify-between max-w-3xl mx-auto px-4">
        
        {/* Background Line */}
        <div className="absolute left-[5%] right-[5%] top-1/2 -translate-y-1/2 h-[2px] bg-neutral-800 z-0" />
        
        {/* Animated Progress Line */}
        <motion.div 
          className="absolute left-[5%] top-1/2 -translate-y-1/2 h-[2px] bg-neutral-300 z-0"
          initial={{ width: "0%" }}
          animate={{ width: \`\${(activeStageIndex / (visibleStages.length - 1)) * 90}%\` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />

        {visibleStages.map((stage, i) => {
          const isCompleted = i < activeStageIndex;
          const isActive = i === activeStageIndex;
          const isFuture = i > activeStageIndex;

          return (
            <motion.div 
              key={stage.label + i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative z-10 flex flex-col items-center gap-3 cursor-pointer group"
              onClick={() => {
                if (!isFuture || isActive) {
                  router.push(\`/project/\${projectId}/features/\${featureId}/\${stage.key}\`);
                }
              }}
            >
              {/* Node */}
              <div className="relative flex items-center justify-center">
                {/* Active Pulse Effect */}
                {isActive && (
                  <motion.div
                    className="absolute w-8 h-8 rounded-full bg-white/20"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  />
                )}
                
                <motion.div 
                  className={\`w-5 h-5 rounded-full transition-colors duration-500 \${
                    isCompleted || isActive 
                      ? "bg-[#d4d4d4] shadow-[0_0_10px_rgba(255,255,255,0.3)]" 
                      : "bg-[#171717] border-2 border-[#333333]"
                  }\`}
                  whileHover={{ scale: isFuture && !isActive ? 1 : 1.2 }}
                />
              </div>

              {/* Label */}
              <span className={\`text-sm font-medium font-mono transition-colors duration-500 \${
                isActive ? "text-white" :
                isCompleted ? "text-[#a3a3a3]" :
                "text-[#525252]"
              }\`}>
                {stage.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
