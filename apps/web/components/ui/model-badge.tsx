"use client";

import { Badge } from "~/components/ui/badge";
import { Sparkles } from "lucide-react";
import { trpc } from "~/trpc/client";

export function ModelBadge() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const plan = session?.user?.plan || "free";

  return (
    <Badge variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary border-primary/20 cursor-default">
      <Sparkles className="w-3 h-3" />
      <span className="text-[10px] font-semibold uppercase tracking-wider">
        {plan === "free" ? "Powered by Llama 3.1" : "Powered by GPT-4o"}
      </span>
    </Badge>
  );
}
