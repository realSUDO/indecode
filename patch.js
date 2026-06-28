const fs = require('fs');
let code = fs.readFileSync('apps/web/app/page.tsx', 'utf-8');

// 1. Add import for next-themes
if (!code.includes('useTheme')) {
  code = code.replace(
    'import { Github, ArrowRight, Sun, Moon } from "lucide-react";',
    'import { Github, ArrowRight, Sun, Moon } from "lucide-react";\nimport { useTheme } from "next-themes";'
  );
}

// 2. Replace LandingPage container
code = code.replace(
  'className="min-h-screen bg-black text-white relative flex flex-col items-center justify-center overflow-hidden pt-32 pb-20"',
  'className="min-h-screen bg-white dark:bg-black text-black dark:text-white relative flex flex-col items-center justify-center overflow-hidden pt-32 pb-20"'
);

// 3. Navbar logic
code = code.replace(
  'const [clickCount, setClickCount] = useState(0);\n  const [isDark, setIsDark] = useState(true);',
  'const { theme, setTheme } = useTheme();\n  const [mounted, setMounted] = useState(false);\n  useEffect(() => setMounted(true), []);\n  const [clickCount, setClickCount] = useState(0);'
);

code = code.replace(
  '{isDark ? <Moon size={16} /> : <Sun size={16} />}',
  '{mounted ? (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />) : <div className="w-4 h-4" />}'
);

code = code.replace(
  'onClick={() => setIsDark(!isDark)}',
  'onClick={() => setTheme(theme === "dark" ? "light" : "dark")}'
);

// 4. Navbar Framer Motion colors
code = code.replace(
  'const headerBg = useTransform(progress, (p) => `rgba(23, 23, 23, ${p * 0.6})`);\n  const headerBorder = useTransform(progress, (p) => `rgba(255, 255, 255, ${p * 0.08})`);',
  'const bgOpacity = useTransform(progress, (p) => p * 0.6);\n  const borderOpacity = useTransform(progress, (p) => p * 0.08);\n  const headerBg = useMotionTemplate`rgba(${theme === "dark" ? "23, 23, 23" : "255, 255, 255"}, ${bgOpacity})`;\n  const headerBorder = useMotionTemplate`rgba(${theme === "dark" ? "255, 255, 255" : "0, 0, 0"}, ${borderOpacity})`;'
);

// 5. Update text-white and text-neutral-400 globally in page.tsx
code = code.replace(/text-white/g, "text-black dark:text-white");
// fix double replaces if they exist
code = code.replace(/text-black dark:text-black dark:text-white/g, "text-black dark:text-white");

code = code.replace(/text-neutral-400/g, "text-neutral-600 dark:text-neutral-400");
code = code.replace(/text-neutral-500/g, "text-neutral-400 dark:text-neutral-500");

// 6. Navbar links and text
code = code.replace(/bg-neutral-900/g, "bg-neutral-100 dark:bg-neutral-900");
code = code.replace(/bg-white\/\[0\.02\]/g, "bg-black/[0.03] dark:bg-white/[0.02]");
code = code.replace(/border-white\/\[0\.08\]/g, "border-black/[0.08] dark:border-white/[0.08]");
code = code.replace(/border-white\/\[0\.04\]/g, "border-black/[0.04] dark:border-white/[0.04]");
code = code.replace(/hover:bg-white\/\[0\.08\]/g, "hover:bg-black/[0.08] dark:hover:bg-white/[0.08]");

fs.writeFileSync('apps/web/app/page.tsx', code);
console.log("Patched page.tsx");
