const fs = require('fs');
let code = fs.readFileSync('apps/web/app/page.tsx', 'utf-8');

code = code.replace(
  'const { theme, setTheme } = useTheme();',
  'const { theme, setTheme, resolvedTheme } = useTheme();'
);

code = code.replace(
  '{mounted ? (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />) : <div className="w-4 h-4" />}',
  '{mounted ? (resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />) : <div className="w-4 h-4" />}'
);

code = code.replace(
  'onClick={() => setTheme(theme === "dark" ? "light" : "dark")}',
  'onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}'
);

code = code.replace(
  'const headerBg = useMotionTemplate`rgba(${theme === "dark" ? "23, 23, 23" : "255, 255, 255"}, ${bgOpacity})`;',
  'const headerBg = useMotionTemplate`rgba(${resolvedTheme === "dark" ? "23, 23, 23" : "255, 255, 255"}, ${bgOpacity})`;'
);

code = code.replace(
  'const headerBorder = useMotionTemplate`rgba(${theme === "dark" ? "255, 255, 255" : "0, 0, 0"}, ${borderOpacity})`;',
  'const headerBorder = useMotionTemplate`rgba(${resolvedTheme === "dark" ? "255, 255, 255" : "0, 0, 0"}, ${borderOpacity})`;'
);

fs.writeFileSync('apps/web/app/page.tsx', code);
console.log("Patched resolvedTheme");
