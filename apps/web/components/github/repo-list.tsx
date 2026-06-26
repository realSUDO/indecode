"use client";

import { useState } from "react";
import { trpc } from "~/trpc/client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, Lock, Unlock, Link as LinkIcon, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";

export function RepoList({ projectId }: { projectId: string }) {
  const [connectingId, setConnectingId] = useState<number | null>(null);
  
  // Using projectId as the organization filter for our placeholder logic
  const { data: repos, isLoading, error } = trpc.github.listRepos.useQuery({
    organizationId: projectId 
  });
  
  const utils = trpc.useUtils();

  const connectRepo = trpc.github.connectRepo.useMutation({
    onSuccess: (data) => {
      toast.success(`Connected ${data.fullName}`);
      setConnectingId(null);
      // Invalidate queries if we have connected repos list to update
      // utils.project.getById.invalidate({ projectId }); 
    },
    onError: (err) => {
      toast.error(err.message || "Failed to connect repository");
      setConnectingId(null);
    }
  });

  if (isLoading) {
    return (
      <Card className="mt-8">
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-8 border-destructive">
        <CardContent className="py-8 text-center text-destructive">
          <p>Error loading repositories.</p>
          <p className="text-sm opacity-80">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Available Repositories</CardTitle>
        <CardDescription>
          Select a repository to connect to this project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {repos?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No repositories found for this installation.
          </div>
        ) : (
          <div className="space-y-4">
            {repos?.map((repo) => (
              <div 
                key={repo.id} 
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {repo.isPrivate ? (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Unlock className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <h4 className="font-medium text-sm sm:text-base">{repo.fullName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {repo.language && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {repo.language}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Default: {repo.defaultBranch}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={connectingId === repo.id}
                  onClick={() => {
                    setConnectingId(repo.id);
                    connectRepo.mutate({
                      projectId,
                      repoFullName: repo.fullName,
                    });
                  }}
                >
                  {connectingId === repo.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LinkIcon className="w-4 h-4 mr-2" />
                  )}
                  Connect
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
