const fs = require('fs');
let code = fs.readFileSync('apps/web/app/page.tsx', 'utf-8');

// 1. Global Background
code = code.replace(/bg-white dark:bg-black/g, 'bg-neutral-50 dark:bg-black');

// 2. Global Text
code = code.replace(/text-black dark:text-white/g, 'text-neutral-900 dark:text-white');

// 3. Bento Cards
code = code.replace(/bg-black\/\[0\.03\] dark:bg-white\/\[0\.02\]/g, 'bg-white dark:bg-white/[0.02] shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-none');

// 4. Bento Borders
code = code.replace(/border-black\/\[0\.08\] dark:border-white\/\[0\.08\]/g, 'border-neutral-200 dark:border-white/[0.08]');
code = code.replace(/border-black\/\[0\.05\] dark:border-white\/\[0\.05\]/g, 'border-neutral-200 dark:border-white/[0.05]');

// 5. Hide Muddy Glows
code = code.replace(/bg-black\/\[0\.03\] dark:bg-white\/\[0\.025\] blur-\[100px\]/g, 'dark:bg-white/[0.025] blur-[100px]');
code = code.replace(/bg-\[radial-gradient\(ellipse_at_top,rgba\(0,0,0,0\.04\),transparent_50%\)\] dark:bg-\[radial-gradient/g, 'dark:bg-[radial-gradient');

// 6. Subtext Fix
code = code.replace(/text-neutral-600 dark:text-neutral-400/g, 'text-neutral-500 dark:text-neutral-400');

// 7. Borders
code = code.replace(/border-black\/\[0\.04\] dark:border-white\/\[0\.04\]/g, 'border-neutral-200 dark:border-white/[0.04]');

fs.writeFileSync('apps/web/app/page.tsx', code);
console.log("Patched premium light mode");
