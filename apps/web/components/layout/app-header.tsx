"use client";

import { SidebarTrigger } from "~/components/ui/sidebar";
import { UserNav } from "./user-nav";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/80 backdrop-blur-md px-4 transition-all duration-300">
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2 px-3">
          {/* Breadcrumbs can go here in the future */}
        </div>
        <div className="flex items-center gap-2">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
