const fs = require('fs');
let code = fs.readFileSync('apps/web/app/pipeline.tsx', 'utf-8');

code = code.replace(/border-white\/5/g, 'border-black/10 dark:border-white/5');
code = code.replace(/borderTopColor: "rgba\\(255,255,255,0\\.3\\)"/g, 'borderTopColor: "currentColor"');
code = code.replace(/className="absolute inset-0 rounded-full border border-black\/10 dark:border-white\/5"/g, 'className="absolute inset-0 rounded-full border border-black/10 dark:border-white/5 text-black/30 dark:text-white/30"');

code = code.replace(/bg-neutral-900/g, 'bg-neutral-100 dark:bg-neutral-900');
code = code.replace(/text-white/g, 'text-black dark:text-white');
code = code.replace(/text-neutral-400/g, 'text-neutral-500 dark:text-neutral-400');
code = code.replace(/border-white\/\[0\.08\]/g, 'border-black/[0.08] dark:border-white/[0.08]');
code = code.replace(/bg-black/g, 'bg-white dark:bg-black');
code = code.replace(/bg-neutral-800/g, 'bg-neutral-200 dark:bg-neutral-800');

fs.writeFileSync('apps/web/app/pipeline.tsx', code);
console.log("Patched pipeline.tsx");
