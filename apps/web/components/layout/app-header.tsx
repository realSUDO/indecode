"use client";

import { useTheme } from "next-themes";
import { Button } from "~/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { UserNav } from "./user-nav";

export function AppHeader() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/80 backdrop-blur-md px-4 transition-all duration-300">
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2 px-3">
          {/* Breadcrumbs can go here in the future */}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <UserNav />
        </div>
      </div>
    </header>
  );
}
