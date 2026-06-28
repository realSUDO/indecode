"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  BarChart, 
  Settings, 
  FolderGit2, 
  LayoutDashboard,
  MessageSquare,
  Box
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "~/components/ui/sidebar";
import { trpc } from "~/trpc/client";
import { ProjectSidebar } from "./project-sidebar";

export function AppSidebar() {
  const params = useParams();
  const projectId = params?.projectId as string;

  const { data: projects } = trpc.project.list.useQuery(undefined, {
    enabled: !projectId
  });

  if (projectId) {
    return <ProjectSidebar />;
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FolderGit2 className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Indecode</span>
            <span className="truncate text-xs">ShipFlow AI</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Dashboard">
              <Link href="/dashboard">
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects?.map((project: any) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton asChild tooltip={project.name}>
                    <Link href={`/project/${project.id}/features`}>
                      <Box />
                      <span>{project.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {projects && projects.length === 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="No projects">
                    <span className="text-muted-foreground opacity-50 text-sm">No projects yet</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                  <Link href="/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4">
          <p className="text-xs text-muted-foreground text-center">Beta v0.1</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
