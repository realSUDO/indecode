"use client";

import { useSidebar } from "~/components/ui/sidebar";
import { trpc } from "~/trpc/client";

export function SidebarUsage() {
  const { state } = useSidebar();
  const { data: session } = trpc.auth.getSession.useQuery();

  if (!session?.user || state === "collapsed") return null;

  const user = session.user as any;
  const isPro = user.plan === "pro";
  
  const featureLimit = isPro ? 20 : 2;
  const reqLimit = isPro ? 200 : 20;

  const featuresCreated = user.featuresCreated || 0;
  const reqsUsed = user.totalExecutions || 0;

  const featurePercent = Math.min(100, Math.round((featuresCreated / featureLimit) * 100));
  const reqPercent = Math.min(100, Math.round((reqsUsed / reqLimit) * 100));

  return (
    <div className="px-3 py-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-xs text-neutral-400 font-medium">
          <span>Features</span>
          <span>{featuresCreated} / {featureLimit} feat</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white/50 rounded-full" 
            style={{ width: `${featurePercent}%` }} 
          />
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-xs text-neutral-400 font-medium">
          <span>LLM Usage</span>
          <span>{reqsUsed} / {reqLimit} req</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white/50 rounded-full" 
            style={{ width: `${reqPercent}%` }} 
          />
        </div>
      </div>
    </div>
  );
}
