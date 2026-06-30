"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function CreateProjectDialog({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const createProject = trpc.project.create.useMutation({
    onSuccess: (data) => {
      toast.success("Project created successfully");
      utils.project.list.invalidate();
      setOpen(false);
      setNewProjectName("");
      router.push(`/project/${data.id}/features`);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-black/80 backdrop-blur-2xl p-8 min-h-[300px] flex flex-col justify-center">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-white text-2xl font-bold tracking-tight">Create a New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateProject} className="flex flex-col gap-6">
          <Input 
            placeholder="Project Name" 
            value={newProjectName} 
            onChange={(e) => setNewProjectName(e.target.value)} 
            disabled={createProject.isPending}
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus-visible:ring-white/20 h-12 text-lg"
          />
          <Button 
            type="submit" 
            disabled={createProject.isPending || !newProjectName.trim()}
            className="bg-white text-black hover:bg-neutral-200 h-12 text-base font-semibold rounded-xl"
          >
            {createProject.isPending ? "Creating..." : "Create Project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
