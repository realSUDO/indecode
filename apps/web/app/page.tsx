"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionTemplate, useMotionValue, useInView, useScroll, useTransform } from "motion/react";
import { Github, Bot, Terminal, GitMerge, FileCode2, ArrowRight } from "lucide-react";
import { PipelineAnimation } from "./pipeline";

// ─── Dark Matter Canvas ─────────────────────────────────────────────────────

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
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
          size: Math.random() * 2 + 0.5,
        });
      }
    };
    init();

    const handleResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; init(); };
    window.addEventListener('resize', handleResize);
    const handleMouseMove = (e: MouseEvent) => { lastMouse.x = mouse.x; lastMouse.y = mouse.y; mouse.x = e.clientX; mouse.y = e.clientY; mouse.vx = mouse.x - lastMouse.x; mouse.vy = mouse.y - lastMouse.y; };
    window.addEventListener('mousemove', handleMouseMove);
    const handleMouseLeave = () => { mouse.x = -1000; mouse.y = -1000; };
    window.addEventListener('mouseleave', handleMouseLeave);

    let rafId: number;
    const render = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dx = mouse.x - p.x; const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) { const force = (200 - dist) / 200; p.vx += (dx / dist) * force * 0.6; p.vy += (dy / dist) * force * 0.6; }
        p.vx *= 0.98; p.vy *= 0.98;
        if (Math.abs(p.vx) < 0.2) p.vx += (Math.random() - 0.5) * 0.1;
        if (Math.abs(p.vy) < 0.2) p.vy += (Math.random() - 0.5) * 0.1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${dist < 200 ? 0.8 : 0.3})`; ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist2 < 120) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist2 / 120) * 0.2})`; ctx.stroke(); }
        }
      }
      rafId = requestAnimationFrame(render);
    };
    render();
    return () => { window.removeEventListener('resize', handleResize); window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseleave', handleMouseLeave); cancelAnimationFrame(rafId); };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
}

// ─── Scroll Word Reveal ─────────────────────────────────────────────────────

function ScrollRevealText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.35"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <RevealWord key={i} word={word} progress={scrollYProgress} index={i} total={words.length} />
      ))}
    </p>
  );
}

function RevealWord({ word, progress, index, total }: { word: string; progress: any; index: number; total: number }) {
  const opacity = useTransform(progress, [index / total, (index + 1) / total], [0.1, 1]);
  return <motion.span style={{ opacity }} className="inline-block mr-[0.27em]">{word}</motion.span>;
}

// ─── Navbar ─────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 inset-x-0 z-50 px-6 sm:px-12 py-5 flex justify-between items-center bg-black/50 backdrop-blur-xl border-b border-white/[0.04]"
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 bg-white text-black flex items-center justify-center rounded-[3px] text-xs font-bold">I</div>
        <span className="text-lg font-semibold tracking-tight text-white">Indecode</span>
      </div>
      <div className="flex items-center gap-6">
        <a href="https://github.com/just_multiply/Shipflow" target="_blank" rel="noreferrer" className="text-neutral-600 hover:text-white transition-colors">
          <Github size={18} />
        </a>
        <Link href="/dashboard" className="px-5 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-colors">
          Open App
        </Link>
      </div>
    </motion.header>
  );
}

// ─── Hero (with scroll parallax) ────────────────────────────────────────────

function HeroSection() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const canvasY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const textScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <section ref={sectionRef} className="relative min-h-[110vh] flex items-center bg-black overflow-hidden">
      {/* Background Interactive Canvas — parallax layer */}
      <motion.div
        style={{ y: canvasY }}
        className="absolute top-0 right-0 bottom-0 w-full lg:w-[80%] z-0 opacity-50 mix-blend-screen [mask-image:linear-gradient(to_right,transparent,black_40%,black_100%)] scale-110"
      >
        <InteractiveCanvas />
      </motion.div>
      {/* Depth fades */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_70%_50%,transparent_30%,black_100%)] pointer-events-none z-[1]" />

      {/* Hero content */}
      <motion.div
        style={{ y: textY, opacity: textOpacity, scale: textScale }}
        className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12"
      >
        <div className="flex flex-col items-start justify-center max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl lg:text-[82px] font-bold tracking-tighter text-white leading-[0.95]"
          >
            From feature request
            <br />
            <span className="text-neutral-500">to merged PR.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-7 text-base md:text-lg text-neutral-500 max-w-lg leading-relaxed"
          >
            I read your repository, generate implementation plans, write production code, and ship merge-ready pull requests. You&apos;re the architect — I&apos;m the engineer.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-10 flex items-center gap-5"
          >
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-black text-sm font-semibold transition-all hover:scale-[1.03] shadow-[0_0_25px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
            >
              Deploy your AI Engineer
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Manifesto (scroll word reveal) ─────────────────────────────────────────

function ManifestoSection() {
  return (
    <section className="py-40 md:py-56 px-6 flex items-center justify-center">
      <ScrollRevealText
        text="I read your codebase. I understand your architecture. I generate a plan. I write the code. I run your tests. I open the PR. You review. You merge. That's it."
        className="text-[clamp(1.4rem,3.5vw,2.5rem)] font-semibold tracking-tight leading-[1.35] text-white max-w-4xl text-center"
      />
    </section>
  );
}

// ─── Pipeline (unchanged — orbital animation) ───────────────────────────────

function PipelineSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.3"] });
  const bgOpacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section ref={ref} className="relative w-full min-h-screen flex flex-col justify-center py-24 md:py-32 overflow-hidden">
      {/* Grey bg revealed on scroll */}
      <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 bg-[#0e0e0e]" />

      <div className="relative z-10 w-full">
        {/* Title — left aligned */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-7xl mx-auto px-6 sm:px-12 mb-10"
        >
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-white leading-[0.95] mb-4">
            The Engine.
          </h2>
          <p className="text-neutral-500 text-base md:text-lg max-w-lg leading-relaxed">
            From the moment you request a feature, I manage the entire delivery lifecycle. Eight stages. Zero handoffs.
          </p>
        </motion.div>

        {/* Pipeline — full width */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          <PipelineAnimation />
        </motion.div>
      </div>
    </section>
  );
}

// ─── Terminal (asymmetric — text left, terminal right) ───────────────────────

function AnimatedTerminal() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "center center"] });
  const terminalScale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
  const terminalY = useTransform(scrollYProgress, [0, 1], [40, 0]);

  const lines = [
    { type: "cmd", text: "> indecode agent --feature 'implement oauth2'" },
    { type: "log", text: "[Info] Analyzing repository vector embeddings..." },
    { type: "log", text: "[Success] Context loaded. Found next-auth in /lib/auth.ts" },
    { type: "log", text: "[Action] Drafting implementation plan..." },
    { type: "cmd", text: "> indecode agent --execute" },
    { type: "code", text: "+ export const authOptions = {" },
    { type: "code", text: "+   providers: [GithubProvider({ clientId: env.GITHUB_ID })]" },
    { type: "code", text: "+ }" },
    { type: "log", text: "[Success] Committed to feature/oauth2" },
    { type: "success", text: "Pull Request #42 opened successfully." }
  ];

  return (
    <section ref={containerRef} className="py-32 md:py-44 bg-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
        {/* Left — text */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white leading-[1.05] mb-5">
            I execute.
            <br />You ship.
          </h2>
          <p className="text-neutral-500 text-base md:text-lg max-w-md leading-relaxed">
            Give me a feature description. I&apos;ll analyze your repo, write the implementation, run your tests, and push a clean PR to your branch. Ready to merge.
          </p>
        </motion.div>

        {/* Right — terminal (scale up on scroll) */}
        <motion.div
          style={{ scale: terminalScale, y: terminalY }}
          className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden shadow-2xl shadow-black/60 font-mono text-sm leading-relaxed"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
            </div>
            <div className="mx-auto text-neutral-700 text-[10px] font-mono">indecode-agent</div>
          </div>
          <div className="p-5 md:p-7 space-y-2.5 text-neutral-400">
            {lines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                transition={{ duration: 0.2, delay: 0.3 + (i * 0.35) }}
                className={
                  line.type === "cmd" ? "text-white font-medium mt-5 first:mt-0" :
                  line.type === "code" ? "text-green-400/80 pl-4 border-l-2 border-green-500/30" :
                  line.type === "success" ? "text-emerald-400 font-semibold mt-5" : "text-neutral-600"
                }
              >
                {line.text}
              </motion.div>
            ))}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: [0, 1, 0] } : {}}
              transition={{ repeat: Infinity, duration: 1, delay: 4 }}
              className="w-2 h-4 bg-white mt-4"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Bento Cards (glow effect preserved) ────────────────────────────────────

function BentoCard({ title, desc, icon: Icon, className }: { title: string; desc: string; icon: any; className?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={`group relative rounded-2xl border border-white/[0.05] bg-neutral-950 overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.08), transparent 80%)`,
        }}
      />
      <div className="relative z-10 flex flex-col h-full p-8 md:p-10">
        <div className="mb-5 w-10 h-10 rounded-lg border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-white/70">
          <Icon size={18} strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-white mb-2 mt-auto">{title}</h3>
        <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function BentoSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.93, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <section ref={ref} className="py-32 md:py-44 bg-black">
      <motion.div
        style={{ scale, opacity }}
        className="max-w-7xl mx-auto px-6 sm:px-12 w-full"
      >
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-4">Architectural Advantages.</h2>
          <p className="text-neutral-500 text-base md:text-lg max-w-xl mx-auto">Designed for software delivery, not generic chat.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[280px]">
          <BentoCard 
            title="RAG-Aware Context" 
            desc="Embeds your entire codebase into vectors. Agents understand your routing, schemas, and patterns before they write." 
            icon={Bot}
            className="md:col-span-2"
          />
          <BentoCard 
            title="Iterative PRs" 
            desc="Fast-forward commits on active branches. No overwritten work, just clean history." 
            icon={GitMerge}
            className="md:col-span-1"
          />
          <BentoCard 
            title="Terminal Operations" 
            desc="Sandbox access to run builds, linters, and tests to verify code before pushing." 
            icon={Terminal}
            className="md:col-span-1"
          />
          <BentoCard 
            title="AI Code Review" 
            desc="Line-by-line automated reviews catching security flaws, logic bugs, and architectural deviations." 
            icon={FileCode2}
            className="md:col-span-2"
          />
        </div>
      </motion.div>
    </section>
  );
}

// ─── CTA ────────────────────────────────────────────────────────────────────

function CTASection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.88, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);

  return (
    <section ref={ref} className="py-44 md:py-56 bg-black relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-white/[0.025] blur-[100px] rounded-full pointer-events-none" />
      <motion.div
        style={{ scale, opacity }}
        className="relative z-10 max-w-4xl mx-auto text-center px-6"
      >
        <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-8 leading-[0.95]">
          Start building faster.
        </h2>
        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold text-base overflow-hidden transition-all hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(255,255,255,0.12)]"
        >
          <span>Deploy Indecode</span>
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-10 bg-black border-t border-white/[0.04] text-center">
      <div className="flex items-center justify-center gap-2 text-neutral-700 text-xs font-mono uppercase tracking-widest">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 animate-pulse" />
        Systems Operational
      </div>
    </footer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black font-sans antialiased selection:bg-white selection:text-black overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <ManifestoSection />
      <PipelineSection />
      <AnimatedTerminal />
      <BentoSection />
      <CTASection />
      <Footer />
    </div>
  );
}
