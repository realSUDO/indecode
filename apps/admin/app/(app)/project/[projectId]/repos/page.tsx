"use client";

import { useParams } from "next/navigation";
import { trpc } from "~/trpc/client";
import { GitHubConnectCard } from "~/components/github/connect-card";
import { RepoList } from "~/components/github/repo-list";
import { Loader2 } from "lucide-react";

export default function ProjectReposPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  // We are using projectId as the organizationId identifier for the backend logic for now
  const { data: status, isLoading } = trpc.github.getInstallationStatus.useQuery({
    projectId: projectId,
  });

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
        <p className="text-muted-foreground mt-2">
          Manage your GitHub repositories connected to this project.
        </p>
      </div>

      {!status?.connected ? (
        <GitHubConnectCard projectId={projectId} />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-accent/30 border rounded-lg">
            <div>
              <p className="font-medium">GitHub App Installed</p>
              <p className="text-sm text-muted-foreground mt-1">
                Connected to account: <span className="font-semibold text-foreground">{status.accountLogin}</span>
              </p>
            </div>
            {/* Future: Add disconnect/configure button here */}
          </div>
          
          <RepoList projectId={projectId} />
        </div>
      )}
    </div>
  );
}
