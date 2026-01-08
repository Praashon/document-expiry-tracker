"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Bell,
  Plus,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutUser } from "@/lib/auth-actions";

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
];

const quickActions = [
  { icon: Plus, label: "New Document", action: "add-document" },
  { icon: TrendingUp, label: "Analytics Overview", action: "stats" },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleQuickAction = (action: string) => {
    if (action === "add-document") {
      // This will be handled by the parent component
      window.dispatchEvent(new CustomEvent("open-add-document"));
    }
  };

  return (
    <aside className="hidden h-screen w-72 flex-col border-r border-neutral-200 bg-gradient-to-b from-white to-neutral-50 dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-950 md:flex fixed left-0 top-0 overflow-y-auto">
      {/* Logo Section */}
      <div className="flex h-16 items-center border-b border-neutral-200 px-6 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#A8BBA3] to-[#8FA58F] flex items-center justify-center shadow-lg">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-[#A8BBA3] to-[#8FA58F] bg-clip-text text-transparent">
              DocTracker
            </span>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Enterprise Document Management
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-6 space-y-8">
        {/* Main Navigation */}
        <div>
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

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide px-3 mb-3">
            Document Management
          </h3>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.action}
                onClick={() => handleQuickAction(action.action)}
                className="w-full group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-gradient-to-r hover:from-[#A8BBA3]/5 hover:to-[#8FA58F]/5 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition-all duration-200"
              >
                <action.icon className="h-5 w-5 text-neutral-500 group-hover:text-[#A8BBA3] transition-colors" />
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-br from-[#A8BBA3]/10 via-[#8FA58F]/5 to-transparent rounded-2xl p-4 border border-[#A8BBA3]/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-[#A8BBA3]" />
            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              System Overview
            </span>
          </div>
          <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
            <div className="flex justify-between">
              <span>Active Records:</span>
              <span className="font-medium text-[#A8BBA3]">--</span>
            </div>
            <div className="flex justify-between">
              <span>Renewal Required:</span>
              <span className="font-medium text-orange-500">--</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex items-center justify-center gap-1 text-xs text-neutral-400 mb-3">
          <Shield className="h-3 w-3" />
          <span>Professional document management</span>
        </div>
        <button
          onClick={() => logoutUser()}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
