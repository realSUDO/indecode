"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { 
  Settings, 
  LayoutDashboard,
  Box,
  CreditCard,
  PanelLeftClose,
  Plus
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar
} from "~/components/ui/sidebar";
import { trpc } from "~/trpc/client";
import { NavUser } from "./nav-user";
import { ProjectSidebar } from "./project-sidebar";
import { CreateProjectDialog } from "~/components/project/create-project-dialog";

function IndecodeLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      fill="none"
      className="size-4 shrink-0"
    >
      <path d="M34 38 L14 64 L34 90" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="64" cy="32" r="8" fill="currentColor" />
      <line x1="64" y1="48" x2="64" y2="88" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      <path d="M94 38 L114 64 L94 90" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AppSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params?.projectId as string;
  const { setOpen, state } = useSidebar();

  const { data: projects } = trpc.project.list.useQuery(undefined, {
    enabled: !projectId
  });

  if (projectId) {
    return <ProjectSidebar />;
  }

  return (
    <Sidebar variant="floating" collapsible="icon" className="animate-in fade-in duration-300">
      <SidebarHeader className="p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center h-14 w-full relative overflow-hidden px-4 transition-all duration-200 group-data-[state=collapsed]:px-3">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-3 flex-1 outline-none"
                onClick={(e) => {
                  if (state === "collapsed") {
                    e.preventDefault();
                    setOpen(true);
                  } else {
                    if (pathname === "/dashboard") {
                      e.preventDefault();
                    }
                    setOpen(false);
                  }
                }}
              >
                <div className="flex aspect-square size-6 shrink-0 items-center justify-center rounded-md bg-white text-black">
                  <IndecodeLogo />
                </div>
                <div className="flex flex-col flex-1 whitespace-nowrap transition-opacity duration-200 group-data-[state=collapsed]:opacity-0">
                  <span className="font-bold text-base tracking-tight text-white leading-none">Indecode</span>
                </div>
              </Link>
              {state === "expanded" && (
                <button 
                  onClick={() => setOpen(false)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer absolute right-3"
                >
                  <PanelLeftClose className="size-4" />
                </button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard" isActive={pathname === "/dashboard"} className="h-10 px-3 rounded-lg data-[active=true]:bg-white/10 data-[active=true]:text-white">
                  <Link href="/dashboard">
                    <LayoutDashboard className="size-4" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Billing" isActive={pathname === "/billing"} className="h-10 px-3 rounded-lg data-[active=true]:bg-white/10 data-[active=true]:text-white mb-2 group-data-[collapsible=icon]:mb-0">
                  <Link href="/billing">
                    <CreditCard className="size-4" />
                    <span className="font-medium">Billing</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mt-4 mb-1 px-3 group-data-[collapsible=icon]:hidden">Projects</div>
              
              {projects?.map((project: any) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton asChild tooltip={project.name} isActive={pathname.includes(`/project/${project.id}`)} className="h-10 px-3 rounded-lg data-[active=true]:bg-white/10 data-[active=true]:text-white">
                    <Link href={`/project/${project.id}/features`}>
                      <Box className="size-4 text-neutral-400" />
                      <span className="font-medium">{project.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {projects && projects.length === 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="No projects" className="h-10 px-3 rounded-lg">
                    <span className="text-muted-foreground opacity-50 text-sm font-medium">No projects yet</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              <SidebarMenuItem>
                <CreateProjectDialog>
                  <SidebarMenuButton asChild tooltip="Create Project" className="h-10 px-3 rounded-lg text-neutral-400 hover:text-white cursor-pointer mt-1 border border-dashed border-white/10 hover:bg-white/5 hover:border-white/20 transition-all">
                    <button>
                      <Plus className="size-4" />
                      <span className="font-medium">Create Project</span>
                    </button>
                  </SidebarMenuButton>
                </CreateProjectDialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>
  );
}
