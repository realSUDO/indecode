"use client"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react"

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
                <AvatarFallback className="rounded-lg bg-white/10 text-white font-semibold">{user.name?.charAt(0) ?? "U"}</AvatarFallback>
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
                  <AvatarFallback className="rounded-lg bg-white/10 text-white font-semibold">{user.name?.charAt(0) ?? "U"}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-white tracking-tight">{user.name}</span>
                  <span className="truncate text-xs text-neutral-400">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10 my-1" />
            <DropdownMenuGroup>
              <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer rounded-lg mx-1 transition-colors">
                <Sparkles className="mr-2 size-4 text-neutral-300" />
                <span className="text-white">Upgrade to Pro</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/10 my-1" />
            <DropdownMenuGroup>
              <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer rounded-lg mx-1 transition-colors text-neutral-300">
                <BadgeCheck className="mr-2 size-4" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer rounded-lg mx-1 transition-colors text-neutral-300">
                <CreditCard className="mr-2 size-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer rounded-lg mx-1 transition-colors text-neutral-300">
                <Bell className="mr-2 size-4" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/10 my-1" />
            <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer text-neutral-400 rounded-lg mx-1 transition-colors">
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
