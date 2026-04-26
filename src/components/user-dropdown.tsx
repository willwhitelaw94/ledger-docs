"use client";

import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";


interface SessionUser {
  sub?: string;
  name?: string;
  email?: string;
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

export function UserDropdown() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/tcid/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-7 w-[60px]" />;
  }

  if (!user) {
    return (
      <a
        href="/api/auth/tcid/login"
        className="inline-flex h-7 items-center rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        Sign in
      </a>
    );
  }

  const handleLogout = async () => {
    await fetch("/api/auth/tcid/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <Avatar size="sm">
          <AvatarFallback className="bg-primary/15 text-primary text-xs">
            {getInitials(user.name, user.email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            {user.name && (
              <p className="text-sm font-medium leading-none">{user.name}</p>
            )}
            {user.email && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            window.open(
              "https://accounts.trilogycare.com.au/profile",
              "_blank"
            )
          }
        >
          <User className="mr-2 size-4" />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
