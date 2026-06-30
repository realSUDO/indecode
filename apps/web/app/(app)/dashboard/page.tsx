"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { trpc } from "~/trpc/client";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "~/components/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreateProjectDialog } from "~/components/project/create-project-dialog";

export default function DashboardPage() {
  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.project.list.useQuery();

  const deleteProject = trpc.project.delete.useMutation({
    onMutate: async ({ projectId }) => {
      // Optimistic update
      await utils.project.list.cancel();
      const previousProjects = utils.project.list.getData();
      if (previousProjects) {
        utils.project.list.setData(undefined, previousProjects.filter((p: any) => p.id !== projectId));
      }
      return { previousProjects };
    },
    onError: (err, newTodo, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        utils.project.list.setData(undefined, context.previousProjects);
      }
      toast.error("Failed to delete project");
    },
    onSettled: () => {
      utils.project.list.invalidate();
    },
  });

  const handleDelete = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault(); // Prevent navigating to project
    e.stopPropagation();
    
    if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      deleteProject.mutate({ projectId });
    }
  };
  
  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <CreateProjectDialog>
          <Button className="bg-white text-black hover:bg-neutral-200 font-medium">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </CreateProjectDialog>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (projects?.length || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 text-white">Your Projects</h2>
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-gray-950 p-6 shadow-sm">
                <div className="space-y-2">
                  <Skeleton className="w-1/2 h-6" />
                  <Skeleton className="w-full h-4" />
                </div>
              </div>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any) => (
              <Link href={`/project/${project.id}/features`} key={project.id} className="group outline-none">
                <Card className="h-full bg-white/5 backdrop-blur-md border-white/10 transition-all duration-300 group-hover:bg-white/10 group-focus-visible:ring-2 group-focus-visible:ring-white/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {project.name}
                      </CardTitle>
                      <button 
                        onClick={(e) => handleDelete(e, project.id)}
                        className="text-neutral-600 hover:text-red-500 transition-colors p-2 rounded-md hover:bg-red-500/10 opacity-0 group-hover:opacity-100"
                        title="Delete Project"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <CardDescription className="line-clamp-2 text-neutral-400">
                      {project.description || "No description provided."}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
            <p className="text-neutral-400 max-w-sm mb-8">
              Get started by creating your first project to organize your feature requests and engineering workflows.
            </p>
            <CreateProjectDialog>
              <Button className="px-6 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all font-semibold">
                Create your first project
              </Button>
            </CreateProjectDialog>
          </div>
        )}
      </div>
    </div>
  );
}
