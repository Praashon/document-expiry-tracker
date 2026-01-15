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
      <div className="flex items-center gap-3"></div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800" />
        <ProfileDropdown user={user} />
      </div>
    </header>
  );
}
