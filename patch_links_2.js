const fs = require('fs');
let code = fs.readFileSync('apps/web/app/page.tsx', 'utf-8');

// Navbar Links
code = code.replace(/<a href="#" className="hover:text-white transition-colors">Platform<\/a>/g, '<a href="#platform" className="hover:text-white transition-colors">Platform</a>');
code = code.replace(/<a href="#" className="hover:text-white transition-colors">Solutions<\/a>/g, '<a href="#solutions" className="hover:text-white transition-colors">Solutions</a>');
code = code.replace(/<a href="#" className="hover:text-white transition-colors">Developers<\/a>/g, '<a href="#developers" className="hover:text-white transition-colors">Developers</a>');

// PipelineSection -> #platform
code = code.replace(
  'function PipelineSection() {\n  const ref = useRef(null);\n  const mouseX = useMotionValue(0);\n  const mouseY = useMotionValue(0);\n\n  return (\n    <section ref={ref} className="',
  'function PipelineSection() {\n  const ref = useRef(null);\n  const mouseX = useMotionValue(0);\n  const mouseY = useMotionValue(0);\n\n  return (\n    <section id="platform" ref={ref} className="'
);

// BentoSection -> #solutions
code = code.replace(
  'function BentoSection() {\n  const ref = useRef(null);\n  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });\n  const scale = useTransform(scrollYProgress, [0, 1], [0.93, 1]);\n  const opacity = useTransform(scrollYProgress, [0, 0.4], [0, 1]);\n\n  return (\n    <section ref={ref} className="',
  'function BentoSection() {\n  const ref = useRef(null);\n  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });\n  const scale = useTransform(scrollYProgress, [0, 1], [0.93, 1]);\n  const opacity = useTransform(scrollYProgress, [0, 0.4], [0, 1]);\n\n  return (\n    <section id="solutions" ref={ref} className="'
);

// AnimatedTerminal -> #developers
code = code.replace(
  'function AnimatedTerminal() {\n  const containerRef = useRef(null);\n  const isInView = useInView(containerRef, { once: true, margin: "-100px" });\n  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "center center"] });\n  const terminalScale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);\n  const terminalY = useTransform(scrollYProgress, [0, 1], [40, 0]);\n\n  const x = useMotionValue(0);\n  const y = useMotionValue(0);\n\n  const rotateX = useTransform(y, [-400, 400], [5, -5]);\n  const rotateY = useTransform(x, [-400, 400], [-5, 5]);\n\n  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {\n    const rect = e.currentTarget.getBoundingClientRect();\n    x.set(e.clientX - (rect.left + rect.width / 2));\n    y.set(e.clientY - (rect.top + rect.height / 2));\n  }\n\n  function handleMouseLeave() {\n    x.set(0);\n    y.set(0);\n  }\n\n  return (\n    <section ref={containerRef} className="',
  'function AnimatedTerminal() {\n  const containerRef = useRef(null);\n  const isInView = useInView(containerRef, { once: true, margin: "-100px" });\n  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "center center"] });\n  const terminalScale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);\n  const terminalY = useTransform(scrollYProgress, [0, 1], [40, 0]);\n\n  const x = useMotionValue(0);\n  const y = useMotionValue(0);\n\n  const rotateX = useTransform(y, [-400, 400], [5, -5]);\n  const rotateY = useTransform(x, [-400, 400], [-5, 5]);\n\n  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {\n    const rect = e.currentTarget.getBoundingClientRect();\n    x.set(e.clientX - (rect.left + rect.width / 2));\n    y.set(e.clientY - (rect.top + rect.height / 2));\n  }\n\n  function handleMouseLeave() {\n    x.set(0);\n    y.set(0);\n  }\n\n  return (\n    <section id="developers" ref={containerRef} className="'
);

if (!code.includes('scroll-smooth')) {
  code = code.replace(
    'className="min-h-screen bg-white dark:bg-black font-sans',
    'className="min-h-screen scroll-smooth bg-white dark:bg-black font-sans'
  );
  code = code.replace(
    'className="min-h-screen bg-black font-sans',
    'className="min-h-screen scroll-smooth bg-black font-sans'
  );
}

fs.writeFileSync('apps/web/app/page.tsx', code);
console.log("Patched links 2");
