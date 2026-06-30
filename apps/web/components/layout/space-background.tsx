"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

function SpaceParticles({ opacity = 1 }: { opacity?: number }) {
  const [stars, setStars] = useState<{ id: number; top: string; left: string; size: number; layer: number; opacity: number; twinkle: boolean }[]>([]);

  useEffect(() => {
    const arr = [];
    // Scatter 150 particles across a single 100vh static viewport
    for (let i = 0; i < 150; i++) {
      arr.push({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: Math.random() > 0.85 ? 2 : 1,
        layer: Math.random() > 0.7 ? 3 : Math.random() > 0.4 ? 2 : 1,
        opacity: Math.random() * 0.5 + 0.1,
        twinkle: Math.random() > 0.7
      });
    }
    setStars(arr);
  }, []);

  return (
    <motion.div style={{ opacity }} className="fixed inset-0 z-[-10] pointer-events-none overflow-hidden bg-black">
      <div className="absolute inset-0">
        {stars.filter(s => s.layer === 1).map(s => (
          <div key={s.id} className={`absolute rounded-full bg-white ${s.twinkle ? 'animate-twinkle' : ''}`} style={{ top: s.top, left: s.left, width: s.size, height: s.size, opacity: s.twinkle ? undefined : s.opacity, '--twinkle-opacity': s.opacity } as React.CSSProperties} />
        ))}
      </div>
      <div className="absolute inset-0">
        {stars.filter(s => s.layer === 2).map(s => (
          <div key={s.id} className={`absolute rounded-full bg-white ${s.twinkle ? 'animate-twinkle' : ''}`} style={{ top: s.top, left: s.left, width: s.size, height: s.size, opacity: s.twinkle ? undefined : s.opacity, '--twinkle-opacity': s.opacity } as React.CSSProperties} />
        ))}
      </div>
      <div className="absolute inset-0">
        {stars.filter(s => s.layer === 3).map(s => (
          <div key={s.id} className={`absolute rounded-full bg-white blur-[0.5px] ${s.twinkle ? 'animate-twinkle' : ''}`} style={{ top: s.top, left: s.left, width: s.size + 1, height: s.size + 1, opacity: s.twinkle ? undefined : s.opacity, '--twinkle-opacity': s.opacity } as React.CSSProperties} />
        ))}
      </div>
    </motion.div>
  );
}

export function SpaceBackground() {
  return (
    <>
      {/* 3D Parallax Starfield */}
      <SpaceParticles />
    </>
  );
}
