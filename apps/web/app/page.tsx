"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionTemplate, useMotionValue, useInView } from "motion/react";
import { Github, Bot, Sparkles, Terminal, GitMerge, FileCode2, ArrowRight } from "lucide-react";

// --- Hooks & Utilities ---

function InteractiveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    let particles: any[] = [];
    let mouse = { x: -1000, y: -1000, vx: 0, vy: 0 };
    let lastMouse = { x: -1000, y: -1000 };

    const init = () => {
      particles = [];
      const numParticles = Math.min((w * h) / 10000, 150);
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          size: Math.random() * 2 + 0.5,
        });
      }
    };
    init();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      init();
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      lastMouse.x = mouse.x;
      lastMouse.y = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.vx = mouse.x - lastMouse.x;
      mouse.vy = mouse.y - lastMouse.y;
    };
    window.addEventListener('mousemove', handleMouseMove);
    
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    window.addEventListener('mouseleave', handleMouseLeave);

    let rafId: number;
    const render = () => {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 200) {
          const force = (200 - dist) / 200;
          p.vx += (dx / dist) * force * 0.6;
          p.vy += (dy / dist) * force * 0.6;
        }

        p.vx *= 0.98;
        p.vy *= 0.98;
        
        if (Math.abs(p.vx) < 0.2) p.vx += (Math.random() - 0.5) * 0.1;
        if (Math.abs(p.vy) < 0.2) p.vy += (Math.random() - 0.5) * 0.1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${dist < 200 ? 0.8 : 0.3})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx2 = p.x - p2.x;
          const dy2 = p.y - p2.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          if (dist2 < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist2 / 120) * 0.2})`;
            ctx.stroke();
          }
        }
      }

      rafId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
}

function useMousePosition() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (ev: MouseEvent) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);

  return mousePosition;
}

// --- Components ---

function Navbar() {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 inset-x-0 z-50 px-6 sm:px-12 py-6 flex justify-between items-center bg-black/50 backdrop-blur-md border-b border-white/[0.05]"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white text-black flex items-center justify-center rounded-sm font-bold font-serif">I</div>
        <span className="text-xl font-medium tracking-tight text-white">Indecode</span>
      </div>
      <div className="flex items-center gap-6">
        <a href="https://github.com/just_multiply/Shipflow" target="_blank" rel="noreferrer" className="text-neutral-500 hover:text-white transition-colors">
          <Github size={20} />
        </a>
        <Link href="/dashboard" className="px-5 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-colors">
          Open Workspace
        </Link>
      </div>
    </motion.header>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-40 pb-32 min-h-screen flex items-center bg-black overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* Background Interactive Canvas (Dark Matter Style) */}
      <div className="absolute top-0 right-0 bottom-0 w-[100%] lg:w-[80%] z-0 flex items-center justify-end opacity-50 mix-blend-screen [mask-image:linear-gradient(to_right,transparent,black_40%,black_100%)]">
        <InteractiveCanvas />
        {/* Bottom vertical fade */}
        <div 
          className="absolute inset-0 transition-colors duration-700 pointer-events-none" 
          style={{ background: "linear-gradient(to top, #000000 0%, transparent 20%)" }} 
        />
      </div>
      {/* Bottom fade for a clean cutoff at the next section */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
        {/* Hero Text (Left) */}
        <motion.div 
          className="flex flex-col items-start justify-center max-w-2xl"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-neutral-400 text-xs font-medium mb-8 backdrop-blur-md"
          >
            <Sparkles size={14} className="text-white" /> The Autonomous AI Pipeline
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-5xl md:text-7xl lg:text-[90px] font-medium tracking-tighter text-white leading-[0.95] text-left"
          >
            The speed of <span className="text-neutral-600">thought.</span><br/>
            Execution of a <span className="text-neutral-600">machine.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-8 text-lg text-neutral-500 max-w-md font-light tracking-wide text-left"
          >
            Indecode reads your repository, plans features, and writes pull requests. You are no longer the typist. You are the architect.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-10 flex items-center gap-6"
          >
            <Link 
              href="/dashboard"
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold overflow-hidden transition-transform hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)]"
            >
              <span className="relative z-10">Start Building</span>
              <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="#terminal"
              className="text-neutral-400 hover:text-white transition-colors font-medium text-sm"
            >
              See how it works &rarr;
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function AnimatedTerminal() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  const lines = [
    { type: "cmd", text: "> indecode agent --feature 'implement oauth2'" },
    { type: "log", text: "[Info] Analyzing repository vector embeddings..." },
    { type: "log", text: "[Success] Context loaded. Found next-auth setup in /lib/auth.ts" },
    { type: "log", text: "[Action] Drafting Implementation Plan..." },
    { type: "cmd", text: "> indecode agent --execute" },
    { type: "code", text: "+ export const authOptions = {" },
    { type: "code", text: "+   providers: [GithubProvider({ clientId: env.GITHUB_ID })]" },
    { type: "code", text: "+ }" },
    { type: "log", text: "[Success] Committed to feature/oauth2" },
    { type: "success", text: "Pull Request #42 opened successfully." }
  ];

  return (
    <section className="py-40 bg-black relative border-t border-white/[0.05]" ref={containerRef}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white mb-6">Built for execution.</h2>
          <p className="text-neutral-500 text-lg max-w-xl mx-auto">No chat UI. No context switching. A raw pipeline that turns human language directly into merged code.</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 1 }}
          className="rounded-2xl border border-white/[0.1] bg-[#0a0a0a] overflow-hidden shadow-2xl font-mono text-sm leading-relaxed"
        >
          {/* Terminal Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] bg-white/[0.01]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
            </div>
            <div className="mx-auto text-neutral-600 text-xs">indecode-agent ~ bash</div>
          </div>
          
          {/* Terminal Body */}
          <div className="p-6 md:p-8 space-y-3 text-neutral-400">
            {lines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{ duration: 0.2, delay: 0.5 + (i * 0.4) }}
                className={
                  line.type === "cmd" ? "text-white font-medium mt-6" :
                  line.type === "code" ? "text-green-400/80 pl-4 border-l border-green-500/30" :
                  line.type === "success" ? "text-emerald-400 font-bold mt-6" : "text-neutral-500"
                }
              >
                {line.text}
              </motion.div>
            ))}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: [0, 1, 0] } : {}}
              transition={{ repeat: Infinity, duration: 1, delay: 4.5 }}
              className="w-2.5 h-5 bg-white mt-4"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Glowing Bento Card Component
function BentoCard({ title, desc, icon: Icon, className }: { title: string, desc: string, icon: any, className?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={`group relative rounded-3xl border border-white/[0.05] bg-neutral-950 overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              rgba(255,255,255,0.1),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative z-10 flex flex-col h-full p-8 md:p-10">
        <div className="mb-6 w-12 h-12 rounded-full border border-white/[0.1] bg-white/[0.02] flex items-center justify-center text-white">
          <Icon size={20} strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-medium tracking-tight text-white mb-3 mt-auto">{title}</h3>
        <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function BentoSection() {
  return (
    <section className="py-40 bg-black">
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        <div className="text-center mb-24">
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white mb-6">Architectural Advantages.</h2>
          <p className="text-neutral-500 text-lg max-w-xl mx-auto">Designed from the ground up for software delivery, not generic chat.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
          <BentoCard 
            title="RAG-Aware Context" 
            desc="Embeds your entire codebase into a vector database. Agents understand your routing, schemas, and patterns before they write." 
            icon={Bot}
            className="md:col-span-2"
          />
          <BentoCard 
            title="Iterative PRs" 
            desc="Standard, fast-forward commits on active branches. No overwritten work, just clean history." 
            icon={GitMerge}
            className="md:col-span-1"
          />
          <BentoCard 
            title="Terminal Operations" 
            desc="The agent has sandbox access to run builds, linters, and tests to verify code automatically." 
            icon={Terminal}
            className="md:col-span-1"
          />
          <BentoCard 
            title="AI Code Review" 
            desc="Line-by-line automated reviews catching security flaws, logic bugs, and architectural deviations instantly." 
            icon={FileCode2}
            className="md:col-span-2"
          />
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-40 bg-black relative border-t border-white/[0.05] overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-white/[0.03] blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
        <h2 className="text-5xl md:text-7xl font-medium tracking-tighter text-white mb-8">
          Start building faster.
        </h2>
        <Link 
          href="/dashboard"
          className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold text-lg overflow-hidden transition-transform hover:scale-105"
        >
          <span className="relative z-10">Deploy Indecode</span>
          <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
          <div className="absolute inset-0 bg-neutral-200 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 bg-black border-t border-white/[0.05] text-center">
      <div className="flex items-center justify-center gap-2 text-neutral-600 text-sm font-mono uppercase tracking-widest">
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        Systems Operational
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans antialiased bg-black selection:bg-white selection:text-black">
      <Navbar />
      <HeroSection />
      <AnimatedTerminal />
      <BentoSection />
      <CTASection />
      <Footer />
    </div>
  );
}
