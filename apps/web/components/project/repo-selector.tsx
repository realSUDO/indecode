"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Github, Loader2, Link as LinkIcon, ExternalLink } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";

export function RepoSelector({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [connectingRepo, setConnectingRepo] = React.useState<string | null>(null);

  const utils = trpc.useUtils();

  // Repos already connected to this project (from our DB)
  const { data: connectedRepos, isLoading: isLoadingConnected } = trpc.github.listConnectedRepos.useQuery(
    { projectId },
    { refetchInterval: 5000 }
  );

  // All repos accessible via the GitHub App installation
  const { data: allGithubRepos, isLoading: isLoadingGithub, error: githubError } = trpc.github.listRepos.useQuery(
    { projectId },
    { retry: false }
  );

  // Get the install URL to show when GitHub App isn't installed
  const { data: installUrlData } = trpc.github.getInstallUrl.useQuery(
    { projectId },
    { enabled: !!githubError }
  );

  const connectRepo = trpc.github.connectRepo.useMutation({
    onSuccess: (data) => {
      toast.success(`Connected ${data.fullName}`);
      setConnectingRepo(null);
      setValue(data.fullName);
      utils.github.listConnectedRepos.invalidate({ projectId });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to connect repository");
      setConnectingRepo(null);
    },
  });

  const syncRepo = trpc.github.syncRepoCodebase.useMutation({
    onSuccess: () => {
      toast.success("Codebase sync started! This might take a minute.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start sync");
    },
  });

  // Filter available repos to exclude already-connected ones
  const availableRepos = allGithubRepos?.filter(
    (githubRepo: any) =>
      !connectedRepos?.some((connected: any) => connected.fullName === githubRepo.fullName)
  );

  const isLoading = isLoadingConnected || isLoadingGithub;

  const selectedRepo = value
    ? connectedRepos?.find((r: any) => r.fullName === value)
    : connectedRepos?.[0];

  const handleConnectRepo = (repoFullName: string) => {
    setConnectingRepo(repoFullName);
    connectRepo.mutate({ projectId, repoFullName });
  };

  // If GitHub App not installed at all, show install button instead of the whole popover
  if (githubError && !isLoadingGithub && (!connectedRepos || connectedRepos.length === 0)) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 gap-2"
          onClick={() => installUrlData?.url && window.open(installUrlData.url, "_blank")}
          disabled={!installUrlData?.url}
        >
          <Github className="h-4 w-4" />
          Install GitHub App
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[320px] justify-between border-white/10 bg-[#0A0A0A] hover:bg-[#111111] hover:text-white"
          >
            <div className="flex items-center gap-2 truncate">
              <Github className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="truncate">
                {isLoading
                  ? "Loading repositories..."
                  : selectedRepo
                    ? selectedRepo.fullName
                    : "Select a repository..."}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0 border-white/10 bg-[#0A0A0A]" align="start">
          <Command>
            <CommandInput placeholder="Search repositories..." className="border-none focus:ring-0" />
            <CommandList>
              <CommandEmpty>
                {githubError
                  ? "GitHub App not installed for this project."
                  : "No repositories found."}
              </CommandEmpty>

              {/* Connected Repos Group */}
              {connectedRepos && connectedRepos.length > 0 && (
                <CommandGroup heading="Connected">
                  {connectedRepos.map((repo: any) => (
                    <CommandItem
                      key={`connected-${repo.id}`}
                      value={repo.fullName ?? ""}
                      keywords={(repo.fullName ?? "").split("/").filter(Boolean)}
                      onSelect={(currentValue) => {
                        setValue(currentValue);
                        setOpen(false);
                      }}
                      className="hover:bg-white/5 data-[selected=true]:bg-white/5 cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedRepo?.fullName === repo.fullName ? "opacity-100 text-emerald-400" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{repo.fullName}</span>
                      {repo.chunkCount > 0 ? (
                        <span className="ml-auto text-[10px] text-emerald-500 font-medium">synced</span>
                      ) : (
                        <span className="ml-auto text-[10px] text-amber-500 font-medium">not synced</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Available Repos Group */}
              {availableRepos && availableRepos.length > 0 && (
                <>
                  {connectedRepos && connectedRepos.length > 0 && <CommandSeparator />}
                  <CommandGroup heading="Available">
                    {availableRepos.map((repo: any) => (
                      <CommandItem
                        key={`available-${repo.id}`}
                        value={repo.fullName ?? ""}
                        keywords={[...(repo.fullName ?? "").split("/").filter(Boolean), repo.name ?? ""]}
                        onSelect={() => handleConnectRepo(repo.fullName)}
                        className="hover:bg-white/5 data-[selected=true]:bg-white/5 cursor-pointer"
                      >
                        {connectingRepo === repo.fullName ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-neutral-400" />
                        ) : (
                          <LinkIcon className="mr-2 h-4 w-4 text-neutral-500" />
                        )}
                        <span className="truncate">{repo.fullName}</span>
                        <span className="ml-auto text-[10px] text-neutral-500 font-medium">
                          {repo.isPrivate ? "private" : "public"}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedRepo && (
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 bg-[#0A0A0A] hover:bg-[#111111] text-neutral-400 hover:text-white h-10 px-4 transition-all"
          disabled={syncRepo.isPending}
          onClick={() => syncRepo.mutate({ repositoryId: selectedRepo.id, projectId })}
        >
          {syncRepo.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {selectedRepo.chunkCount > 0 ? (
            "Resync"
          ) : (
            <span className="text-yellow-500 font-medium">Sync Codebase (Action Required)</span>
          )}
        </Button>
      )}
    </div>
  );
}
