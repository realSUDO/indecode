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
  const [syncingId, setSyncingId] = useState<string | null>(null);
  
  // Using projectId as the organization filter for our placeholder logic
  const { data: allGithubRepos, isLoading, error } = trpc.github.listRepos.useQuery({
    organizationId: projectId 
  });

  const { data: connectedRepos } = trpc.github.listConnectedRepos.useQuery(
    { projectId },
    { refetchInterval: 5000 } // Poll to update chunk count when syncing
  );
  
  const utils = trpc.useUtils();

  const connectRepo = trpc.github.connectRepo.useMutation({
    onSuccess: (data) => {
      toast.success(`Connected ${data.fullName}`);
      setConnectingId(null);
      utils.github.listConnectedRepos.invalidate({ projectId });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to connect repository");
      setConnectingId(null);
    }
  });

  const disconnectRepo = trpc.github.disconnectRepo.useMutation({
    onSuccess: () => {
      toast.success("Disconnected repository");
      utils.github.listConnectedRepos.invalidate({ projectId });
    }
  });

  const syncRepo = trpc.github.syncRepoCodebase.useMutation({
    onSuccess: () => {
      toast.success("Codebase sync started! This might take a minute.");
      setSyncingId(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start sync");
      setSyncingId(null);
    }
  });

  // Filter out repos that are already connected
  const availableRepos = allGithubRepos?.filter(
    (githubRepo: any) => !connectedRepos?.some((connected: any) => connected.fullName === githubRepo.fullName)
  );

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
    <>
      {/* Connected Repositories */}
      <Card className="mt-8 border-indigo-500/20 shadow-md shadow-indigo-500/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Connected Repositories</CardTitle>
          <CardDescription>
            Repositories that are actively linked to this project. Sync the codebase to enable AI Repository Intelligence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectedRepos?.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg border border-dashed text-center">
              No repositories connected yet. Select one from below.
            </div>
          ) : (
            <div className="space-y-3">
              {connectedRepos?.map((repo: any) => (
                <div key={repo.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card rounded-lg border border-border/60 hover:border-border transition-colors gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-md">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{repo.fullName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {repo.chunkCount > 0 ? (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs">
                            Synced ({repo.chunkCount} chunks)
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs">
                            Not synced
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="default" 
                      size="sm"
                      disabled={syncingId === repo.id || syncRepo.isPending}
                      onClick={() => {
                        setSyncingId(repo.id);
                        syncRepo.mutate({ repositoryId: repo.id });
                      }}
                      className={repo.chunkCount > 0 ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : ""}
                    >
                      {syncingId === repo.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      {repo.chunkCount > 0 ? "Resync" : "Sync Codebase"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => disconnectRepo.mutate({ repositoryId: repo.id })}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Repositories */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Available Repositories</CardTitle>
          <CardDescription>
            Repositories from your connected GitHub account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableRepos?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No new repositories available.
            </div>
          ) : (
            <div className="space-y-4">
              {availableRepos?.map((repo: any) => (
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
    </>
  );
}
