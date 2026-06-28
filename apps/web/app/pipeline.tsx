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
    <div className="relative flex items-center justify-center w-28 h-28">
      {/* Outer slow ring */}
      <motion.div 
        className="absolute inset-0 rounded-full border border-white/5"
        style={{ borderTopColor: "rgba(255,255,255,0.3)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      {/* Inner reverse ring */}
      <motion.div 
        className="absolute inset-3 rounded-full border border-white/5"
        style={{ borderBottomColor: "rgba(255,255,255,0.4)" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Inner Crystal Core */}
      <motion.div 
        className="w-5 h-5 bg-white rounded-full shadow-[0_0_30px_rgba(255,255,255,0.6)]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function NodeIcon({ isActive, isCurrent }: { isActive: boolean; isCurrent: boolean }) {
  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      {/* Sleek outer ring, static unless active */}
      <div 
        className={`absolute w-5 h-5 rounded-full border transition-all duration-500 ${
          isActive ? "border-white/40 delay-200" : "border-white/10 delay-0"
        }`}
      />
      
      {/* Solid inner core when activated */}
      <motion.div 
        className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: isActive ? 1 : 0, 
          opacity: isActive ? 1 : 0 
        }}
        transition={{ 
          duration: 0.4, 
          type: "spring", 
          bounce: 0.4,
          delay: isActive ? 0.2 : 0 
        }}
      />

      {/* Ping ring when current */}
      {isCurrent && (
        <motion.div 
          className="absolute w-5 h-5 rounded-full border border-white/40"
          animate={{ scale: [1, 2.2], opacity: [0.8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.2 }}
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
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <motion.path 
                d={rayPath}
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: isDrawingRay ? [0, 1] : 0, 
                  opacity: isDrawingRay ? [0, 1, 0] : 0 
                }}
                transition={{ 
                  duration: 0.3,
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
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: isDrawingArc ? 1 : 0, 
                  opacity: isDrawingArc ? 1 : 0 
                }}
                transition={{ 
                  duration: 1.2,
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
              className={`absolute whitespace-nowrap text-[11px] tracking-widest font-mono uppercase transition-all duration-500 ${
                labelIsTop ? "bottom-full mb-4" : labelIsBottom ? "top-full mt-4" : "mt-12"
              } ${
                isActive ? "text-white/80 delay-200" : "text-white/20 delay-0"
              }`}
              style={{
                ...(Math.abs(Math.sin(angle)) <= 0.1 && { top: '25px' })
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
