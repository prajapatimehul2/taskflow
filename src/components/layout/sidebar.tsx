"use client";

import { LogOut } from "lucide-react";
import { NavLinks } from "@/components/layout/nav-links";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { logoutAction } from "@/lib/actions/auth";

type SidebarProps = {
  userName?: string | null;
  userEmail?: string | null;
  onNavigate?: () => void;
};

export function Sidebar({ userName, userEmail, onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col gap-1 bg-surface px-3 py-4">
      <div className="px-2 pb-3">
        <span className="text-sm font-semibold tracking-tight text-foreground">TaskFlow</span>
      </div>

      <NavLinks onNavigate={onNavigate} />

      <div className="mt-auto flex flex-col gap-1 pt-3">
        <ThemeToggle />
        <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5">
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{userName ?? "Account"}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Log out"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
