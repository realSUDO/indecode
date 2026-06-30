"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";

function GithubCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const linkMutation = trpc.github.linkInstallationToProject.useMutation();

  useEffect(() => {
    const processCallback = async () => {
      const installationIdStr = searchParams.get("installation_id");
      const setupAction = searchParams.get("setup_action");
      const state = searchParams.get("state"); // We pass projectId in state

      if (installationIdStr && setupAction === "install" && state) {
        const installationId = parseInt(installationIdStr, 10);
        try {
          // Add a small delay because GitHub's webhook might take a second to hit our backend
          await new Promise(resolve => setTimeout(resolve, 1500));
          await linkMutation.mutateAsync({ installationId, projectId: state });
          toast.success("GitHub App installed successfully!");
        } catch (error) {
          toast.error("Failed to link GitHub App to this project.");
          console.error(error);
        }
      } else {
        toast.info("Returned from GitHub.");
      }

      // Redirect back to the project if state (projectId) is provided
      if (state) {
        router.push(`/project/${state}/repos`);
      } else {
        router.push("/dashboard");
      }
    };

    processCallback();
  }, [router, searchParams, linkMutation]);

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <h2 className="text-xl font-semibold">Connecting to GitHub...</h2>
      <p className="text-muted-foreground mt-2">Please wait while we complete the setup.</p>
    </div>
  );
}

export default function GithubCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <GithubCallbackContent />
    </Suspense>
  );
}
