const fs = require('fs');
let code = fs.readFileSync('apps/web/app/page.tsx', 'utf-8');

// 1. Space Particles
code = code.replace(/bg-white blur-\[0\.5px\]/g, 'bg-black/30 dark:bg-white blur-[0.5px]');
code = code.replace(/className={\`absolute rounded-full bg-white /g, 'className={`absolute rounded-full bg-black/40 dark:bg-white ');

// 2. Bento Cards grid lines (Terminal Sandbox)
code = code.replace(
  'rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)',
  'rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)'
);

// 3. Radial Glows in Bento Cards
code = code.replace(
  'border-[1px] border-white/[0.05] rounded-full [mask-image:linear-gradient(to_bottom_left,black,transparent)]',
  'border-[1px] border-black/[0.05] dark:border-white/[0.05] rounded-full [mask-image:linear-gradient(to_bottom_left,black,transparent)]'
);
// Make sure both instances are caught (it appears twice)
code = code.replace(
  /border-white\/\[0\.05\]/g,
  'border-black/[0.05] dark:border-white/[0.05]'
);

// 4. CTA Blur glow
code = code.replace(
  'bg-white/[0.025] blur-[100px]',
  'bg-black/[0.03] dark:bg-white/[0.025] blur-[100px]'
);

// 5. Manifesto Radial Glow
code = code.replace(
  'bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.05),transparent_50%)]',
  'bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.04),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.05),transparent_50%)]'
);

fs.writeFileSync('apps/web/app/page.tsx', code);
console.log("Patched glows in page.tsx");
