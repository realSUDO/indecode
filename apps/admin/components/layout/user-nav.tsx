"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { trpc } from "~/trpc/client";
import { authClient } from "~/lib/auth-client";
import { LogOut, Settings, CreditCard, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function UserNav() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const router = useRouter();

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : user.email?.substring(0, 2).toUpperCase() || "U";

  const handleSignOut = async () => {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || ""} alt={user.name || "Avatar"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings/profile" className="w-full cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/billing" className="w-full cursor-pointer">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="w-full cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/50">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
