"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { 
  GitPullRequest, 
  Settings, 
  MessageSquare,
  Github,
  ListTodo,
  Box,
  ArrowLeft,
  PanelLeftClose
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
  useSidebar
} from "~/components/ui/sidebar";
import { trpc } from "~/trpc/client";
import { NavUser } from "./nav-user";
import { SidebarUsage } from "./sidebar-usage";



export function ProjectSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  const { setOpen, state } = useSidebar();
  
  const { data: project } = trpc.project.getById.useQuery({ projectId }, {
    enabled: !!projectId
  });
  
  const { data: pullRequests } = trpc.pullRequest.listByProject.useQuery({ projectId }, {
    enabled: !!projectId
  });

  const activePRs = pullRequests?.filter((pr: any) => pr.status === "open" || pr.status === "processing" || pr.status === "draft") || [];
  const closedPRs = pullRequests?.filter((pr: any) => pr.status === "closed" || pr.status === "merged") || [];

  return (
    <Sidebar variant="floating" collapsible="icon" className="animate-in fade-in duration-300">
      <SidebarHeader className="p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center h-14 w-full relative overflow-hidden px-4 transition-all duration-200 group-data-[state=collapsed]:px-3">
              <div 
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => {
                  setOpen(state === "collapsed");
                }}
              >
                <div className="flex aspect-square size-6 shrink-0 items-center justify-center rounded-md bg-white text-black">
                  <Box className="size-4 fill-black" />
                </div>
                <div className="flex flex-col flex-1 whitespace-nowrap transition-opacity duration-200 group-data-[state=collapsed]:opacity-0">
                  <span className="truncate font-bold text-base text-white tracking-tight leading-none">
                    {project?.name || "Loading..."}
                  </span>
                </div>
              </div>
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
                <SidebarMenuButton 
                  asChild 
                  tooltip="Dashboard" 
                  className="h-10 px-3 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-all mb-4 group-data-[collapsible=icon]:mb-2"
                >
                  <Link href="/dashboard">
                    <ArrowLeft className="size-4" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1 px-3 group-data-[collapsible=icon]:hidden">Workspace</div>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  tooltip="Features" 
                  isActive={pathname.includes("/features")}
                  className="h-10 px-3 rounded-lg data-[active=true]:bg-white/10 data-[active=true]:text-white"
                >
                  <Link href={`/project/${projectId}/features`}>
                    <ListTodo className="size-4 text-neutral-400" />
                    <span className="font-medium">Features</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Removed old single Pull Request Link */}

              {/* Added Collapsible Pull Requests Section */}
              <div className="mt-4 mb-1 px-3 flex items-center justify-between group-data-[collapsible=icon]:hidden">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Pull Requests</span>
                <Link href={`/project/${projectId}/pulls`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <GitPullRequest className="size-3 text-neutral-500 hover:text-white" />
                </Link>
              </div>
              
              {activePRs.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70 mb-1 px-4 group-data-[collapsible=icon]:hidden">Active</div>
                  {activePRs.map((pr: any) => (
                    <SidebarMenuItem key={pr.id}>
                      <SidebarMenuButton 
                        asChild 
                        tooltip={pr.title}
                        isActive={pathname === `/project/${projectId}/pulls/${pr.id}`}
                        className={`h-8 px-4 rounded-lg data-[active=true]:bg-white/10 data-[active=true]:text-white text-sm ${pr.isIndecode ? "text-neutral-200" : "text-neutral-500 opacity-60"}`}
                      >
                        <Link href={`/project/${projectId}/pulls/${pr.id}`}>
                          <GitPullRequest className={`size-3.5 ${pr.isIndecode ? "text-emerald-500" : "text-neutral-500"}`} />
                          <span className="font-medium truncate">{pr.title}</span>
                          {pr.isIndecode && <span className="ml-auto text-[8px] uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded">AI</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              )}

              {closedPRs.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600 mb-1 px-4 mt-2 group-data-[collapsible=icon]:hidden">History</div>
                  {closedPRs.map((pr: any) => (
                    <SidebarMenuItem key={pr.id}>
                      <SidebarMenuButton 
                        asChild 
                        tooltip={pr.title}
                        isActive={pathname === `/project/${projectId}/pulls/${pr.id}`}
                        className={`h-8 px-4 rounded-lg data-[active=true]:bg-white/10 data-[active=true]:text-white text-sm hover:text-neutral-300 ${pr.isIndecode ? "text-neutral-400" : "text-neutral-600 opacity-50"}`}
                      >
                        <Link href={`/project/${projectId}/pulls/${pr.id}`}>
                          <GitPullRequest className="size-3.5" />
                          <span className="font-medium truncate">{pr.title}</span>
                          {pr.isIndecode && <span className="ml-auto text-[8px] uppercase tracking-widest bg-neutral-500/20 text-neutral-400 px-1 py-0.5 rounded">AI</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              )}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarUsage />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
