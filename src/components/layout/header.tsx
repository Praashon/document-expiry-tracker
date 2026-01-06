"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const userName =
    user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "Pro Account";

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-neutral-200 bg-white/80 px-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80 sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center justify-end gap-4">
        <ThemeToggle />

        <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800" />

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {userName}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {userEmail}
            </span>
          </div>
          <div className="h-8 w-8 rounded-full bg-linear-to-tr from-[#A8BBA3] to-[#8FA58F] flex items-center justify-center text-white text-sm font-bold shadow-md">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
