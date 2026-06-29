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
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <div className="flex flex-col gap-1 px-4 py-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project</span>
          <span className="truncate font-bold text-lg">{project?.name || "Loading..."}</span>
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
