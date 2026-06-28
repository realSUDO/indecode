const fs = require('fs');
let code = fs.readFileSync('apps/web/app/pipeline.tsx', 'utf-8');

// SVG strokes
code = code.replace(/stroke="rgba\\(255,255,255,0\.05\\)"/g, 'stroke="currentColor" className="text-black/5 dark:text-white/5"');
code = code.replace(/stroke="white"/g, 'stroke="currentColor" className="text-black dark:text-white"');
code = code.replace(/stroke="rgba\\(255,255,255,0\.4\\)"/g, 'stroke="currentColor" className="text-black/40 dark:text-white/40"');

// NodeIcon borders
code = code.replace(/border-white\/40/g, 'border-black/40 dark:border-white/40');
code = code.replace(/border-white\/10/g, 'border-black/10 dark:border-white/10');

// Inner Core
code = code.replace(/bg-white rounded-full shadow-\[0_0_30px_rgba\\(255,255,255,0\.6\\)\]/g, 'bg-black dark:bg-white rounded-full shadow-[0_0_30px_rgba(0,0,0,0.4)] dark:shadow-[0_0_30px_rgba(255,255,255,0.6)]');

fs.writeFileSync('apps/web/app/pipeline.tsx', code);
console.log("Patched pipeline.tsx");
