"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

const steps = [
  { label: "Connect Repo" },
  { label: "Feature Request" },
  { label: "Generate PRD" },
  { label: "Task List" },
  { label: "Implement" },
  { label: "Pull Request" },
  { label: "Review" },
  { label: "Merge & Ship" },
];

function CoreEngine() {
  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      {/* Gyroscopic Ring 1 */}
      <motion.div 
        className="absolute inset-0 rounded-full border-[2px] border-white/10"
        style={{ borderTopColor: "rgba(255,255,255,0.7)", borderBottomColor: "rgba(255,255,255,0.7)" }}
        animate={{ rotateZ: 360, rotateX: 75, rotateY: 20 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      {/* Gyroscopic Ring 2 */}
      <motion.div 
        className="absolute inset-2 rounded-full border-[2px] border-white/10"
        style={{ borderLeftColor: "rgba(255,255,255,0.7)", borderRightColor: "rgba(255,255,255,0.7)" }}
        animate={{ rotateZ: -360, rotateX: 20, rotateY: 75 }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      />
      {/* Gyroscopic Ring 3 */}
      <motion.div 
        className="absolute inset-5 rounded-full border-[1px] border-white/30"
        style={{ borderTopColor: "rgba(255,255,255,1)" }}
        animate={{ rotateZ: 360, rotateX: 45, rotateY: 45 }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Inner Crystal Core */}
      <motion.div 
        className="w-10 h-10 bg-white shadow-[0_0_60px_rgba(255,255,255,1)]"
        style={{ rotate: 45 }}
        animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function NodeIcon({ isActive, isCurrent }: { isActive: boolean; isCurrent: boolean }) {
  return (
    <div className="relative flex items-center justify-center w-16 h-16">
      {/* Hollow geometric frame */}
      <motion.div 
        className={`absolute w-5 h-5 border-[1.5px] border-white/30 transition-all duration-700 ${
          isActive ? "border-white/80 shadow-[0_0_15px_rgba(255,255,255,0.5)]" : ""
        }`}
        style={{ rotate: 45 }}
        animate={isActive ? { rotate: [45, 135, 225, 315] } : { rotate: 45 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Solid inner core when activated */}
      <motion.div 
        className="absolute w-2.5 h-2.5 bg-white shadow-[0_0_20px_rgba(255,255,255,1)]"
        style={{ rotate: 45 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: isActive ? 1 : 0, 
          opacity: isActive ? 1 : 0 
        }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.5 }}
      />

      {/* Ping ring when current */}
      {isCurrent && (
        <motion.div 
          className="absolute w-8 h-8 border border-white/50"
          style={{ rotate: 45 }}
          animate={{ scale: [1, 2.5], opacity: [0.8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
      )}
    </div>
  );
}

export function PipelineAnimation() {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= steps.length) return -1;
        return prev + 1;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const centerX = 500;
  const centerY = 500;
  const radius = 320; 

  return (
    <div className="relative w-full h-full overflow-visible hidden md:block">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
        {steps.map((_, i) => {
          const angle = (i * Math.PI * 2) / steps.length - Math.PI / 2;
          const nodeX = centerX + Math.cos(angle) * radius;
          const nodeY = centerY + Math.sin(angle) * radius;
          
          const startGap = 60; // gap from core
          const endGap = 25; // gap from node
          const startX = centerX + Math.cos(angle) * startGap;
          const startY = centerY + Math.sin(angle) * startGap;
          const endX = nodeX - Math.cos(angle) * endGap;
          const endY = nodeY - Math.sin(angle) * endGap;

          const rayPath = `M ${startX} ${startY} L ${endX} ${endY}`;
          const isDrawingRay = activeIndex >= i;

          const nextAngle = ((i + 1) * Math.PI * 2) / steps.length - Math.PI / 2;
          const arcGap = 0.12; 
          const arcStartAngle = angle + arcGap;
          const arcEndAngle = nextAngle - arcGap;
          
          const arcStartX = centerX + Math.cos(arcStartAngle) * radius;
          const arcStartY = centerY + Math.sin(arcStartAngle) * radius;
          const arcEndX = centerX + Math.cos(arcEndAngle) * radius;
          const arcEndY = centerY + Math.sin(arcEndAngle) * radius;
          
          const arcPath = `M ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 0 1 ${arcEndX} ${arcEndY}`;
          const isDrawingArc = activeIndex > i;

          return (
            <g key={`connection-${i}`}>
              <path 
                d={rayPath}
                fill="none"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <motion.path 
                d={rayPath}
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: isDrawingRay ? [0, 1] : 0, 
                  opacity: isDrawingRay ? [0, 1, 0] : 0 
                }}
                transition={{ 
                  duration: 0.4,
                  ease: "easeOut"
                }}
              />

              <path 
                d={arcPath}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
              <motion.path 
                d={arcPath}
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: isDrawingArc ? 1 : 0, 
                  opacity: isDrawingArc ? 1 : 0 
                }}
                transition={{ 
                  duration: 1.5,
                  ease: "linear"
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Central AI Core */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
        <CoreEngine />
        <div className="mt-4 font-mono font-bold tracking-[0.2em] uppercase text-[10px] text-white/80 whitespace-nowrap">
          Indecode Engine
        </div>
      </div>

      {/* Orbiting Nodes */}
      {steps.map((step, idx) => {
        const angle = (idx * Math.PI * 2) / steps.length - Math.PI / 2;
        const nodeX = centerX + Math.cos(angle) * radius;
        const nodeY = centerY + Math.sin(angle) * radius;

        const isActive = activeIndex >= idx;
        const isCurrent = activeIndex === idx;

        const labelIsTop = Math.sin(angle) < -0.1;
        const labelIsBottom = Math.sin(angle) > 0.1;

        return (
          <motion.div
            key={idx}
            className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2"
            style={{ 
              left: `${(nodeX / 1000) * 100}%`, 
              top: `${(nodeY / 1000) * 100}%` 
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <NodeIcon isActive={isActive} isCurrent={isCurrent} />

            <div 
              className={`absolute whitespace-nowrap text-[12px] tracking-widest font-mono uppercase transition-all duration-500 ${
                labelIsTop ? "bottom-full mb-6" : labelIsBottom ? "top-full mt-6" : "mt-16"
              } ${
                isActive ? "text-white" : "text-neutral-600 opacity-40"
              }`}
              style={{
                ...(Math.abs(Math.sin(angle)) <= 0.1 && { top: '35px' })
              }}
            >
              {step.label}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
