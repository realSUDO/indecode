"use client";

import { SidebarTrigger } from "~/components/ui/sidebar";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2 px-3">
          {/* Breadcrumbs can go here in the future */}
          <span className="text-sm font-medium">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">

          {/* User Profile dropdown will go here */}
        </div>
      </div>
    </header>
  );
}
