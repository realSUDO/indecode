const fs = require('fs');
let code = fs.readFileSync('apps/web/app/page.tsx', 'utf-8');

// Fix the main wrapper background
code = code.replace(
  'className="min-h-screen bg-black font-sans antialiased selection:bg-white selection:text-black overflow-x-hidden relative"',
  'className="min-h-screen bg-white dark:bg-black font-sans antialiased selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black overflow-x-hidden relative"'
);

// Check if any other bg-black remains
code = code.replace(/ bg-black /g, ' bg-white dark:bg-black ');

fs.writeFileSync('apps/web/app/page.tsx', code);
console.log("Patched main background");
