"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ProfileDropdown } from "./profile-dropdown";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-neutral-200 bg-white/80 px-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80 sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center justify-end gap-4">
        <ThemeToggle />

        <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800" />

        <ProfileDropdown user={user} />
      </div>
    </header>
  );
}
