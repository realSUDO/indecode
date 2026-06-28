const fs = require('fs');
let code = fs.readFileSync('apps/web/app/pipeline.tsx', 'utf-8');

code = code.replace(/stroke="rgba\\(255, 255, 255, 0\\.1\\)"/g, 'className="stroke-black/10 dark:stroke-white/10"');
code = code.replace(/stroke="rgba\\(255, 255, 255, 0\\.05\\)"/g, 'className="stroke-black/5 dark:stroke-white/5"');
code = code.replace(/fill="rgba\\(255, 255, 255, 0\\.02\\)"/g, 'className="fill-black/5 dark:fill-white/[0.02]"');

// Fix gradients for light mode (replace #ffffff with generic colors or CSS variables)
// Actually, generic white beams look fine in light mode too if the background is slightly off-white, but since bg is pure white, white beams are invisible.
// Let's replace white with black for the beam.
// Stop-colors:
code = code.replace(/<stop offset="50%" stopColor="#ffffff" stopOpacity="1" \/>/g, '<stop offset="50%" className="stop-black dark:stop-white" stopOpacity="1" />');
// Wait, stop-color can be styled with CSS class? `stop-color` CSS property exists.
// Tailwind doesn't have a stop-color class by default. We can use `stopColor="currentColor"` and `className="text-black dark:text-white"`.
code = code.replace(/stopColor="#ffffff"/g, 'stopColor="currentColor"');
code = code.replace(/<linearGradient/g, '<linearGradient className="text-black dark:text-white"');
// Wait, the beam circles also use white: `fill="#ffffff"`
code = code.replace(/fill="#ffffff"/g, 'fill="currentColor" className="text-black dark:text-white"');

// But there are multiple fills. Let's just do a manual replace using multi_replace_file_content!
