"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { 
  GitPullRequest, 
  Settings, 
  MessageSquare,
  Github,
  ListTodo
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "~/components/ui/sidebar";
import { trpc } from "~/trpc/client";

export function ProjectSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  
  const { data: project } = trpc.project.getById.useQuery({ projectId }, {
    enabled: !!projectId
  });

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="animate-in fade-in duration-300">
      <SidebarHeader>
        <div className="flex flex-col gap-2 px-4 py-3">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors group"
          >
            <svg className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <div className="mt-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Project</span>
            <div className="truncate font-bold text-lg text-foreground tracking-tight">
              {project?.name || (
                <div className="h-6 w-24 bg-muted animate-pulse rounded mt-1" />
              )}
            </div>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  tooltip="Features" 
                  isActive={pathname.includes("/features")}
                >
                  <Link href={`/project/${projectId}/features`}>
                    <ListTodo />
                    <span>Features</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  tooltip="Repositories"
                  isActive={pathname.includes("/repos")}
                >
                  <Link href={`/project/${projectId}/repos`}>
                    <Github />
                    <span>Repositories</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  tooltip="Pull Requests"
                  isActive={pathname.includes("/pulls")}
                >
                  <Link href={`/project/${projectId}/pulls`}>
                    <GitPullRequest />
                    <span>Pull Requests</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  tooltip="Settings"
                  isActive={pathname.includes("/settings")}
                >
                  <Link href={`/project/${projectId}/settings`}>
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
