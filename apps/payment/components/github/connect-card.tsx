"use client";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Github } from "lucide-react";
import { trpc } from "~/trpc/client";

export function GitHubConnectCard({ projectId, orgId }: { projectId: string; orgId?: string }) {
  // Pass the projectId in the state parameter so the callback knows where to return
  const { data: installData, isLoading } = trpc.github.getInstallUrl.useQuery({
    organizationId: projectId, 
  });

  const handleInstall = () => {
    if (installData?.url) {
      window.location.href = installData.url;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="w-6 h-6" />
          Connect GitHub
        </CardTitle>
        <CardDescription>
          Install the Indecode GitHub App to link repositories to this project. 
          This allows us to automatically sync PRs and perform AI Code Reviews.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleInstall} 
          disabled={isLoading || !installData?.url}
          className="w-full sm:w-auto"
        >
          {isLoading ? "Loading..." : "Install GitHub App"}
        </Button>
      </CardContent>
    </Card>
  );
}
