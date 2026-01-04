"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Bell } from "lucide-react";
import { Models } from "appwrite";

interface HeaderProps {
    user: Models.User<Models.Preferences> | null;
}

export function Header({ user }: HeaderProps) {
    return (
        <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-neutral-200 bg-white/80 px-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center justify-end gap-4">

                <ThemeToggle />

                <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800" />

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                            {user?.name || "User"}
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {user?.email || "Pro Account"}
                        </span>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-linear-to-tr from-[#A8BBA3] to-[#8FA58F] flex items-center justify-center text-white text-sm font-bold shadow-md">
                        {user?.name?.charAt(0) || "U"}
                    </div>
                </div>
            </div>
        </header>
    );
}
