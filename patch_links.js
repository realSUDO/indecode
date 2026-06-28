const fs = require('fs');
let code = fs.readFileSync('apps/web/app/page.tsx', 'utf-8');

// 1. Update Navbar links
code = code.replace(
  '<a href="#" className="hover:text-white transition-colors">Platform</a>',
  '<a href="#platform" className="hover:text-white transition-colors">Platform</a>'
);
code = code.replace(
  '<a href="#" className="hover:text-white transition-colors">Solutions</a>',
  '<a href="#solutions" className="hover:text-white transition-colors">Solutions</a>'
);
code = code.replace(
  '<a href="#" className="hover:text-white transition-colors">Developers</a>',
  '<a href="#developers" className="hover:text-white transition-colors">Developers</a>'
);

// 2. Add IDs to sections
// PipelineSection: <section ref={ref} className="py-32 relative">
code = code.replace(
  'function PipelineSection() {\n  const ref = useRef(null);\n  return (\n    <section ref={ref} className="py-32 md:py-48 relative overflow-hidden flex flex-col items-center justify-center">',
  'function PipelineSection() {\n  const ref = useRef(null);\n  return (\n    <section id="platform" ref={ref} className="py-32 md:py-48 relative overflow-hidden flex flex-col items-center justify-center">'
);

// AnimatedTerminal: <section ref={containerRef} className="py-32 relative overflow-hidden">
code = code.replace(
  'return (\n    <section ref={containerRef} className="py-24 md:py-32 relative flex flex-col items-center justify-center overflow-hidden perspective-[2000px]">',
  'return (\n    <section id="developers" ref={containerRef} className="py-24 md:py-32 relative flex flex-col items-center justify-center overflow-hidden perspective-[2000px]">'
);

// BentoSection: <section ref={ref} className="py-32 relative max-w-7xl mx-auto px-4 md:px-8">
code = code.replace(
  'return (\n    <section ref={ref} className="py-32 md:py-48 relative max-w-7xl mx-auto px-4 md:px-8 overflow-visible">',
  'return (\n    <section id="solutions" ref={ref} className="py-32 md:py-48 relative max-w-7xl mx-auto px-4 md:px-8 overflow-visible">'
);

// Ensure CSS smooth scroll is enabled globally
if (!code.includes('scroll-smooth')) {
  code = code.replace(
    'className="min-h-screen bg-black font-sans',
    'className="min-h-screen scroll-smooth bg-black font-sans'
  );
}

fs.writeFileSync('apps/web/app/page.tsx', code);
console.log("Patched links");
