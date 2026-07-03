"use client"

import {
  CreditCard,
  LogOut,
  Settings,
  User,
  ChevronsUpDown
} from "lucide-react"
import Link from "next/link"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar"
import { trpc } from "~/trpc/client"
import { authClient } from "~/lib/auth-client"

export function NavUser() {
  const { isMobile, state, setOpen } = useSidebar()
  const { data: session } = trpc.auth.getSession.useQuery()

  const user = session?.user

  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="animate-pulse bg-white/5" />
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : user.email?.substring(0, 2).toUpperCase() || "U";

  const plan = (user as any).plan || "free";

  const handleSignOut = async () => {
    // Clear cookie
    const domain = process.env.NODE_ENV === "production" ? `.${process.env.NEXT_PUBLIC_APP_DOMAIN || "indecode.in"}` : "localhost";
    document.cookie = `indecode-logged-in=; domain=${domain}; path=/; max-age=0`;

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          const isDev = process.env.NODE_ENV !== "production";
          const signInUrl = isDev ? "http://localhost:3002/sign-in" : `https://auth.${process.env.NEXT_PUBLIC_APP_DOMAIN || "indecode.in"}/sign-in`;
          window.location.href = signInUrl;
        },
      },
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-white/10 data-[state=open]:text-white hover:bg-white/5 hover:text-white transition-colors bg-white/5 border border-white/10 backdrop-blur-md rounded-xl"
              onClick={(e) => {
                if (state === "collapsed") {
                  e.preventDefault();
                  setOpen(true);
                }
              }}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                <AvatarFallback className="rounded-lg bg-white/10 text-white font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-white tracking-tight">{user.name}</span>
                <span className="truncate text-xs text-neutral-400">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-neutral-500" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl border border-white/10 bg-black/80 backdrop-blur-2xl shadow-2xl shadow-black/80 p-1"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={12}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                  <AvatarFallback className="rounded-lg bg-white/10 text-white font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-white tracking-tight">{user.name}</span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${
                      plan === "pro" ? "bg-indigo-500/20 text-indigo-400" :
                      plan === "enterprise" ? "bg-amber-500/20 text-amber-400" :
                      "bg-white/10 text-neutral-400"
                    }`}>
                      {plan}
                    </span>
                  </div>
                  <span className="truncate text-xs text-neutral-400">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            
            {(plan === "free") && (
              <>
                <DropdownMenuSeparator className="bg-white/10 my-1" />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer rounded-lg mx-1 transition-colors">
                    <Link href="/billing" className="w-full text-indigo-400 focus:text-indigo-400">
                      <CreditCard className="mr-2 size-4" />
                      <span>Upgrade to Pro</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}

            <DropdownMenuSeparator className="bg-white/10 my-1" />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer rounded-lg mx-1 transition-colors text-neutral-300">
                <Link href="/settings/profile" className="w-full">
                  <User className="mr-2 size-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer rounded-lg mx-1 transition-colors text-neutral-300">
                <Link href="/billing" className="w-full">
                  <CreditCard className="mr-2 size-4" />
                  <span>Billing</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer rounded-lg mx-1 transition-colors text-neutral-300">
                <Link href="/settings" className="w-full">
                  <Settings className="mr-2 size-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator className="bg-white/10 my-1" />
            <DropdownMenuItem onClick={handleSignOut} className="focus:bg-white/10 focus:text-white cursor-pointer text-neutral-400 rounded-lg mx-1 transition-colors">
              <LogOut className="mr-2 size-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
