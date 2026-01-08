"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Bell, TrendingUp, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
    description: "Overview of all documents",
  },
  {
    icon: Bell,
    label: "Reminders",
    href: "/dashboard/reminders",
    description: "Upcoming expirations",
  },
  {
    icon: TrendingUp,
    label: "Analytics",
    href: "/dashboard/analytics",
    description: "Statistics and insights",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-72 flex-col border-r border-neutral-200 bg-gradient-to-b from-white to-neutral-50 dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-950 md:flex fixed left-0 top-0 overflow-y-auto">
      <div className="flex h-16 items-center border-b border-neutral-200 px-6 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-[#A8BBA3] via-[#8FA58F] to-[#6B8E6B] flex items-center justify-center shadow-lg shadow-[#A8BBA3]/30">
            <ShieldCheck className="h-5 w-5 text-white" />
            <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-green-400 rounded-full border-2 border-white dark:border-neutral-900" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-[#A8BBA3] via-[#8FA58F] to-[#6B8E6B] bg-clip-text text-transparent">
              DocTracker
            </span>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Never miss an expiry
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide px-3 mb-3">
          Navigation
        </h3>
        <div className="space-y-2">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex flex-col gap-1 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 relative overflow-hidden",
                  isActive
                    ? "bg-gradient-to-r from-[#A8BBA3]/10 to-[#8FA58F]/10 text-[#A8BBA3] dark:text-[#A8BBA3] shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#A8BBA3] to-[#8FA58F] rounded-r-full"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                  />
                )}
                <div className="flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      isActive
                        ? "text-[#A8BBA3]"
                        : "text-neutral-500 group-hover:text-neutral-700 dark:text-neutral-400 dark:group-hover:text-neutral-300",
                    )}
                  />
                  <span className="relative z-10">{item.label}</span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 ml-8">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
