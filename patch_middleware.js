const fs = require('fs');
let code = fs.readFileSync('apps/web/middleware.ts', 'utf-8');

const newRewrite = `
  if (isAppDomain) {
    if (url.pathname === '/') {
      url.pathname = '/dashboard';
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }
`;

code = code.replace(/if \(isAppDomain\) \{[\s\S]*?return NextResponse.rewrite\(url\);\n  \}/, newRewrite.trim());

fs.writeFileSync('apps/web/middleware.ts', code);
console.log("Patched middleware");
