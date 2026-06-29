"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionTemplate, useMotionValue, useInView, useScroll, useTransform, useMotionValueEvent } from "motion/react";
import { Github, ArrowRight} from "lucide-react";
import { PipelineAnimation } from "./pipeline";

// ─── Interactive Early Access Button ────────────────────────────────────────

function EarlyAccessButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("success");
        setTimeout(() => {
          setStatus("idle");
          setIsOpen(false);
          setEmail("");
        }, 2000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <motion.div 
      initial={false}
      animate={{ width: isOpen ? 340 : 160 }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className="relative p-[1.5px] rounded-full overflow-hidden shadow-[0_0_25px_rgba(255,255,255,0.05)] group"
    >
      {/* Static border when closed */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${isOpen ? "opacity-0" : "opacity-100 bg-white/[0.1]"}`} />

      {/* Moving Rainbow Border Layer */}
      <div 
        className={`absolute left-1/2 top-1/2 w-[600px] h-[600px] bg-[conic-gradient(from_0deg,red,orange,yellow,green,blue,indigo,violet,red)] transition-opacity duration-500 ${isOpen ? "opacity-100" : "opacity-0"}`} 
        style={{
          animation: "spin-smooth 4s linear infinite"
        }}
      />
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-smooth {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}} />
      
      <form 
        onSubmit={handleSubmit}
        className="relative w-full flex items-center h-[52px] bg-neutral-950 rounded-full overflow-hidden"
      >
        <input 
          ref={inputRef}
          type="email" 
          placeholder="Enter your email..." 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="absolute left-0 w-[220px] h-full bg-transparent pl-5 pr-2 text-sm text-white placeholder:text-neutral-500 outline-none"
          style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none', transition: 'opacity 0.3s ease 0.1s' }}
        />
        <motion.button
          type={isOpen ? "submit" : "button"}
          onClick={(e) => {
            if (!isOpen) {
              e.preventDefault();
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }
          }}
          disabled={status === "submitting" || status === "success"}
          animate={{ width: isOpen ? 100 : "100%" }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-200 transition-colors z-10 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        >
          <span className="flex items-center gap-2">
            {status === "success" ? "Added" : status === "error" ? "Failed" : status === "submitting" ? "..." : isOpen ? "Join" : "Early access"}
            {status === "idle" && !isOpen && <ArrowRight size={16} />}
          </span>
        </motion.button>
      </form>
    </motion.div>
  );
}

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
      const numParticles = Math.min((w * h) / 5000, 320); // Tweaked density
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 1.3, vy: (Math.random() - 0.5) * 1.3,
          size: Math.random() * 1.8 + 0.5,
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
        if (dist < 180) { const force = (180 - dist) / 180; p.vx += (dx / dist) * force * 0.5; p.vy += (dy / dist) * force * 0.5; }
        p.vx *= 0.98; p.vy *= 0.98;
        if (Math.abs(p.vx) < 0.2) p.vx += (Math.random() - 0.5) * 0.1;
        if (Math.abs(p.vy) < 0.2) p.vy += (Math.random() - 0.5) * 0.1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${dist < 180 ? 0.7 : 0.25})`; ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist2 < 150) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist2 / 150) * 0.25})`; ctx.stroke(); }
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
  const { scrollY } = useScroll();
  const [clickCount, setClickCount] = useState(0);

  const btnColors = [
    "bg-white text-black hover:bg-neutral-200 shadow-[0_0_15px_rgba(255,255,255,0.3)]",
    "bg-blue-100 text-blue-900 hover:bg-blue-200 shadow-none border border-blue-300/[0.5]",
    "bg-red-100 text-red-900 hover:bg-red-200 shadow-none border border-red-300/[0.5]",
    "bg-yellow-100 text-yellow-900 hover:bg-yellow-200 shadow-none border border-yellow-300/[0.5]",
    "bg-green-100 text-green-900 hover:bg-green-200 shadow-none border border-green-300/[0.5]"
  ];
  const currentBtnColor = btnColors[clickCount % btnColors.length];

  // Scroll progress from 0 to 1 over 400px
  const progress = useTransform(scrollY, [0, 400], [0, 1]);
  
  const wrapperPad = useTransform(progress, (p) => `${p * 1.5}rem`);
  
  // Use CSS calc to seamlessly interpolate between 100% (100vw) and fixed 768px
  const headerMaxWidth = useTransform(progress, (p) => `calc(100vw - (100vw - 768px) * ${p})`);
  
  const headerRadius = useTransform(progress, (p) => `${p * 9999}px`);
  const headerBg = useTransform(progress, (p) => `rgba(23, 23, 23, ${p * 0.6})`);
  const headerBorder = useTransform(progress, (p) => `rgba(255, 255, 255, ${p * 0.08})`);
  const headerPadY = useTransform(progress, (p) => `${20 - p * 14}px`); // 20px to 6px
  const headerPadX = useTransform(progress, (p) => `${48 - p * 42}px`); // 48px to 6px
  const headerMarginTop = useTransform(progress, (p) => `${p * 24}px`); // 0 to 24px
  
  const logoPadLeft = useTransform(progress, (p) => `${p * 16}px`); // 0 to 16px
  const logoPadRight = useTransform(progress, (p) => `${p * 24}px`); // 0 to 24px

  return (
    <>
      {/* Full-width gradient blur backdrop to softly blur content scrolling up */}
      <div 
        className="fixed inset-x-0 top-0 h-32 z-40 pointer-events-none backdrop-blur-[12px]"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
        }}
      />

      <motion.div 
        style={{ paddingLeft: wrapperPad, paddingRight: wrapperPad }}
        className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none"
      >
        <motion.header 
        style={{ 
          width: "100%",
          maxWidth: headerMaxWidth,
          borderRadius: headerRadius,
          backgroundColor: headerBg,
          borderColor: headerBorder,
          paddingTop: headerPadY,
          paddingBottom: headerPadY,
          paddingLeft: headerPadX,
          paddingRight: headerPadX,
          marginTop: headerMarginTop,
        }}
        className="pointer-events-auto flex items-center justify-between backdrop-blur-2xl border border-solid shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
      >
        <motion.div 
          style={{
            paddingLeft: logoPadLeft,
            paddingRight: logoPadRight,
          }}
          className="flex items-center gap-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 128 128"
            fill="none"
            className="flex-shrink-0"
          >
            {/* Left bracket */}
            <path
              d="M34 38 L14 64 L34 90"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* i */}
            <circle
              cx="64"
              cy="32"
              r="6"
              fill="white"
            />
            <line
              x1="64"
              y1="46"
              x2="64"
              y2="88"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Right bracket */}
            <path
              d="M94 38 L114 64 L94 90"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-medium tracking-tight text-white">Indecode</span>
        </motion.div>
        
        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 px-4 text-xs font-medium text-neutral-400">
          <a href="#platform" className="hover:text-white transition-colors">Platform</a>
          <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
          <a href="#developers" className="hover:text-white transition-colors">Developers</a>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setClickCount(prev => prev + 1)}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105 ${currentBtnColor}`}
          >
            Coming Soon
          </button>
        </div>
      </motion.header>
      </motion.div>
    </>
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
    <section ref={sectionRef} className="relative min-h-[110vh] flex items-center bg-black overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]">
      {/* Background Interactive Canvas — parallax layer */}
      <motion.div
        style={{ y: canvasY }}
        className="absolute top-0 right-0 bottom-0 w-full lg:w-[75%] z-0 opacity-80 mix-blend-screen [mask-image:linear-gradient(to_right,transparent,black_35%,black_100%)] scale-110"
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
          <h1 className="text-5xl md:text-7xl lg:text-[82px] font-bold tracking-tighter text-white leading-[0.95] flex flex-wrap gap-x-4">
            <motion.span initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="inline-block">From</motion.span>
            <motion.span initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} className="inline-block">feature</motion.span>
            <motion.span initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} className="inline-block">request</motion.span>
            <div className="w-full h-0"></div>
            <motion.span initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} className="inline-block text-neutral-500">to</motion.span>
            <motion.span initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }} className="inline-block text-neutral-500">merged</motion.span>
            <motion.span initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.7, ease: [0.16, 1, 0.3, 1] }} className="inline-block text-neutral-500">PR.</motion.span>
          </h1>

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
            className="mt-10 flex flex-col md:flex-row items-center gap-5"
          >
            <EarlyAccessButton />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Manifesto (scroll word reveal) ─────────────────────────────────────────

function ManifestoSection() {
  return (
    <section className="py-40 md:py-56 px-6 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(255,255,255,0.03)_0%,transparent_100%)] pointer-events-none" />
      <ScrollRevealText
        text="I read your codebase. I understand your architecture. I generate a plan. I write the code. I run your tests. I open the PR. You review. You merge. That's it."
        className="text-[clamp(1.4rem,3.5vw,2.5rem)] font-semibold tracking-tight leading-[1.35] text-white max-w-4xl text-center relative z-10"
      />
    </section>
  );
}

// ─── Pipeline (unchanged — orbital animation) ───────────────────────────────

function PipelineSection() {
  const ref = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <section id="platform" ref={ref} onMouseMove={handleMouseMove} className="relative w-full min-h-[90vh] flex items-center py-40 md:py-56 overflow-hidden group [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]">
      {/* Premium Technical Grid Background instead of flat grey */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none" />
      
      {/* Interactive Glowing Grid Overlay */}
      <motion.div 
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(167,139,250,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(167,139,250,0.2)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-0 group-hover:opacity-100 transition duration-500"
        style={{
          maskImage: useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, black, transparent)`
        }}
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-32">
        
        {/* Left: The Engine (Bleeding out slightly for dramatic effect) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="w-full lg:w-[50%] flex justify-center lg:justify-start lg:-ml-12"
        >
          <div className="relative w-full aspect-square max-w-[800px] lg:scale-[1.35] lg:-translate-x-16">
            <PipelineAnimation />
          </div>
        </motion.div>

        {/* Right: The Text */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="w-full lg:w-[38%] hidden lg:block"
        >
          <h2 className="text-5xl md:text-7xl lg:text-[80px] font-bold tracking-tighter text-white leading-[0.95] mb-8">
            The Engine.
          </h2>
          <p className="text-neutral-500 text-base md:text-lg max-w-md leading-relaxed">
            From the moment you request a feature, I manage the entire delivery lifecycle. Eight stages. Zero handoffs.
          </p>
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

  // 3D Tilt physics
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-200, 200], [4, -4]);
  const rotateY = useTransform(x, [-200, 200], [-4, 4]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - (rect.left + rect.width / 2));
    y.set(e.clientY - (rect.top + rect.height / 2));
  }
  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

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
    <section id="developers" ref={containerRef} className="py-32 md:py-44 relative overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]">
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

        {/* Right — terminal (scale up on scroll + 3D hover) */}
        <div style={{ perspective: 1200 }}>
          <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ scale: terminalScale, y: terminalY, rotateX, rotateY }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
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
      </div>
    </section>
  );
}

// ─── Bento Cards (glow effect preserved) ────────────────────────────────────

function BentoCard({ title, desc, stepNumber, className = "", delay = 0, patternColor, children }: { title: string; desc: string; stepNumber: string; className?: string; delay?: number; patternColor?: string; children?: React.ReactNode }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const backgroundGradient = useMotionTemplate`radial-gradient(500px circle at ${mouseX}px ${mouseY}px, rgba(167,139,250,0.12), transparent 80%)`;
  const maskGradient = useMotionTemplate`radial-gradient(250px circle at ${mouseX}px ${mouseY}px, black 20%, transparent 80%)`;

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative rounded-3xl border transition-colors duration-500 overflow-hidden cursor-pointer ${isRevealed ? "border-white/[0.2] bg-neutral-900" : "border-white/[0.05] bg-neutral-950"} ${className}`}
      onClick={() => setIsRevealed(!isRevealed)}
      onMouseMove={handleMouseMove}
    >
      {/* Background glow layer */}
      <motion.div
        className={`pointer-events-none absolute -inset-px rounded-3xl transition duration-500 z-10 ${isRevealed ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        style={isRevealed ? { background: "radial-gradient(800px circle at center, rgba(255,255,255,0.06), transparent 80%)" } : { background: backgroundGradient }}
      />
      
      {/* The Content */}
      <motion.div 
        className={`relative z-20 flex flex-col h-full p-8 md:p-10 transition-opacity duration-500 ${isRevealed ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        style={isRevealed ? { WebkitMaskImage: "none", maskImage: "none" } : {
          WebkitMaskImage: maskGradient,
          maskImage: maskGradient
        }}
      >
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/40 flex items-center gap-3">
          <div className="w-1 h-1 rounded-full bg-white/30" />
          SYS.{stepNumber}
        </div>
        
        <div className="mt-auto pt-8">
          <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-4">{title}</h3>
          <p className="text-base text-neutral-400 leading-relaxed max-w-sm">{desc}</p>
        </div>
      </motion.div>

      {children && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          {children}
        </div>
      )}
    </motion.div>
  );
}

function BentoSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.93, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <section id="solutions" ref={ref} className="py-32 md:py-48 relative overflow-hidden">
      <motion.div
        style={{ scale, opacity }}
        className="max-w-7xl mx-auto px-6 sm:px-12 w-full relative z-10"
      >
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tighter text-white mb-6">Intelligence Architecture.</h2>
          <p className="text-neutral-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">Engineered from the ground up to understand, build, and ship production software without human intervention.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[340px]">
          
          <BentoCard 
            title="RAG-Aware Context" 
            desc="Embeds your entire codebase into vectors. Agents understand your routing, schemas, and patterns before they write." 
            stepNumber="01"
            className="md:col-span-8"
            delay={0.1}
            patternColor="bg-purple-500/20"
          >
            <div className="absolute right-0 top-0 bottom-0 w-[60%] bg-[radial-gradient(ellipse_at_right,rgba(167,139,250,0.1),transparent_70%)] transition-opacity duration-700 group-hover:opacity-100 opacity-60" />
            <div className="absolute -right-20 -top-20 w-[400px] h-[400px] border-[1px] border-white/[0.05] rounded-full [mask-image:linear-gradient(to_bottom_left,black,transparent)]" />
            <div className="absolute -right-10 -top-10 w-[300px] h-[300px] border-[1px] border-white/[0.05] rounded-full [mask-image:linear-gradient(to_bottom_left,black,transparent)]" />
          </BentoCard>

          <BentoCard 
            title="Iterative PRs" 
            desc="Fast-forward commits on active branches. No overwritten work, just clean history." 
            stepNumber="02"
            className="md:col-span-4"
            delay={0.2}
            patternColor="bg-emerald-500/20"
          >
             <div className="absolute bottom-0 right-0 left-0 h-1/2 bg-[linear-gradient(to_top,rgba(99,102,241,0.08),transparent)]" />
          </BentoCard>

          <BentoCard 
            title="Terminal Sandbox" 
            desc="Runs builds, linters, and tests in isolated containers to verify code before pushing." 
            stepNumber="03"
            className="md:col-span-5"
            delay={0.3}
            patternColor="bg-sky-500/20"
          >
             <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_60%_at_100%_100%,#000_10%,transparent_100%)]" />
          </BentoCard>

          <BentoCard 
            title="Automated Audits" 
            desc="Line-by-line AI reviews catching security flaws, logic bugs, and architectural deviations natively." 
            stepNumber="04"
            className="md:col-span-7"
            delay={0.4}
            patternColor="bg-orange-500/20"
          >
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1/2 h-[200px] bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.1),transparent_70%)]" />
          </BentoCard>

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
    <section ref={ref} className="py-44 md:py-56 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-white/[0.025] blur-[100px] rounded-full pointer-events-none" />
      <motion.div
        style={{ scale, opacity }}
        className="relative z-10 max-w-4xl mx-auto text-center px-6"
      >
        <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-8 leading-[0.95]">
          Start building faster.
        </h2>
        <div className="flex justify-center">
          <EarlyAccessButton />
        </div>
      </motion.div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-10 text-center">
      {/* Empty footer for spacing */}
    </footer>
  );
}

// ─── Space Particles ────────────────────────────────────────────────────────

function SpaceParticles({ opacity }: { opacity: any }) {
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
    <motion.div style={{ opacity }} className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0">
        {stars.filter(s => s.layer === 1).map(s => (
          <div key={s.id} className={`absolute rounded-full bg-white ${s.twinkle ? 'animate-pulse' : ''}`} style={{ top: s.top, left: s.left, width: s.size, height: s.size, opacity: s.opacity }} />
        ))}
      </div>
      <div className="absolute inset-0">
        {stars.filter(s => s.layer === 2).map(s => (
          <div key={s.id} className={`absolute rounded-full bg-white ${s.twinkle ? 'animate-pulse' : ''}`} style={{ top: s.top, left: s.left, width: s.size, height: s.size, opacity: s.opacity }} />
        ))}
      </div>
      <div className="absolute inset-0">
        {stars.filter(s => s.layer === 3).map(s => (
          <div key={s.id} className={`absolute rounded-full bg-white blur-[0.5px] ${s.twinkle ? 'animate-pulse' : ''}`} style={{ top: s.top, left: s.left, width: s.size + 1, height: s.size + 1, opacity: s.opacity }} />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const auroraOpacity = useTransform(scrollYProgress, [0, 0.15], [0, 1]);

  return (
    <div className="min-h-screen scroll-smooth bg-black font-sans antialiased selection:bg-white selection:text-black overflow-x-hidden relative">
      
      {/* 3D Parallax Starfield */}
      <SpaceParticles opacity={auroraOpacity} />

      {/* Ultra-Subtle Drifting Aurora */}
      <motion.div style={{ opacity: auroraOpacity }} className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{
            x: ["-10vw", "30vw", "50vw", "10vw", "-10vw"],
            y: ["-10vh", "50vh", "90vh", "30vh", "-10vh"],
          }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-0 w-[80vw] h-[80vw] rounded-full mix-blend-screen"
          style={{ background: "radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 60%)" }}
        />
        <motion.div 
          animate={{
            x: ["50vw", "10vw", "-20vw", "40vw", "50vw"],
            y: ["90vh", "30vh", "-10vh", "60vh", "90vh"],
          }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-0 w-[90vw] h-[90vw] rounded-full mix-blend-screen"
          style={{ background: "radial-gradient(circle, rgba(167, 139, 250, 0.06) 0%, transparent 60%)" }}
        />
      </motion.div>

      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <ManifestoSection />
        <PipelineSection />
        <AnimatedTerminal />
        <BentoSection />
        <CTASection />
        <Footer />
      </div>
    </div>
  );
}
