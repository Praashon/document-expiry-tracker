"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ProfileDropdown } from "./profile-dropdown";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  user: User | null;
  sidebarCollapsed?: boolean;
}

export function Header({ user, sidebarCollapsed = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-neutral-200 bg-white/80 px-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="flex items-center gap-3">
        {/*{sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 md:flex">
            <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-[#A8BBA3] via-[#8FA58F] to-[#6B8E6B] flex items-center justify-center shadow-sm">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-[#A8BBA3] to-[#6B8E6B] bg-clip-text text-transparent hidden sm:inline">
              DocTracker
            </span>
          </Link>
        )}*/}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800" />
        <ProfileDropdown user={user} />
      </div>
    </header>
  );
}
