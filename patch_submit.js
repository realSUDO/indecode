const fs = require('fs');
let code = fs.readFileSync('apps/web/app/page.tsx', 'utf-8');

const oldHandleSubmit = `  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("submitting");
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        setIsOpen(false);
        setEmail("");
      }, 2000);
    }, 1000);
  };`;

const newHandleSubmit = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("success");
        setTimeout(() => {
          setStatus("idle");
          setIsOpen(false);
          setEmail("");
        }, 2000);
      } else {
        setStatus("idle");
      }
    } catch (err) {
      console.error(err);
      setStatus("idle");
    }
  };`;

code = code.replace(oldHandleSubmit, newHandleSubmit);
fs.writeFileSync('apps/web/app/page.tsx', code);
console.log("Patched handleSubmit");
