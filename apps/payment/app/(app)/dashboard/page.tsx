"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { trpc } from "~/trpc/client";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { toast } from "sonner";

export default function DashboardPage() {
  const utils = trpc.useUtils();
  const router = useRouter();
  const { data: projects, isLoading } = trpc.project.list.useQuery();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const createProject = trpc.project.create.useMutation({
    onSuccess: (data) => {
      toast.success("Project created successfully");
      utils.project.list.invalidate();
      setIsDialogOpen(false);
      setNewProjectName("");
      router.push(`/project/${data.id}/repos`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create project");
    }
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createProject.mutate({ name: newProjectName });
  };

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="flex flex-col gap-4 mt-4">
              <Input 
                placeholder="Project Name" 
                value={newProjectName} 
                onChange={(e) => setNewProjectName(e.target.value)} 
                disabled={createProject.isPending}
                required
              />
              <Button type="submit" disabled={createProject.isPending || !newProjectName.trim()}>
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
        <h2 className="text-xl font-semibold mb-4">Your Projects</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any) => (
              <Link href={`/project/${project.id}/features`} key={project.id}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>
                      {project.description || "No description provided."}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg border-dashed">
            <p className="text-muted-foreground mb-4">You don't have any projects yet.</p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline">
              Create your first project
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
