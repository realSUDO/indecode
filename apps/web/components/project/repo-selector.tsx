"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Github, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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

  const { data: connectedRepos, isLoading } = trpc.github.listConnectedRepos.useQuery(
    { projectId },
    { refetchInterval: 5000 }
  );
  
  const syncRepo = trpc.github.syncRepoCodebase.useMutation({
    onSuccess: () => {
      toast.success("Codebase sync started! This might take a minute.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start sync");
    }
  });

  const selectedRepo = value 
    ? connectedRepos?.find((r: any) => r.fullName === value) 
    : connectedRepos?.[0];

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[280px] justify-between border-white/10 bg-[#0A0A0A] hover:bg-[#111111] hover:text-white"
          >
            <div className="flex items-center gap-2 truncate">
              <Github className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="truncate">
                {isLoading ? "Loading repositories..." : selectedRepo ? selectedRepo.fullName : "No repositories connected"}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 border-white/10 bg-[#0A0A0A]" align="start">
          <Command>
            <CommandInput placeholder="Search repository..." className="border-none focus:ring-0" />
            <CommandList>
              <CommandEmpty>No repository found.</CommandEmpty>
              <CommandGroup>
                {connectedRepos?.map((repo: any) => (
                  <CommandItem
                    key={repo.id}
                    value={repo.fullName}
                    keywords={[repo.name, repo.owner]}
                    onSelect={(currentValue) => {
                      setValue(currentValue);
                      setOpen(false);
                    }}
                    className="hover:bg-white/5 data-[selected=true]:bg-white/5 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedRepo?.fullName === repo.fullName ? "opacity-100 text-white" : "opacity-0"
                      )}
                    />
                    {repo.fullName}
                  </CommandItem>
                ))}
              </CommandGroup>
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
