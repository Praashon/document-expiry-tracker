"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Bell,
  TrendingUp,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: Bell,
    label: "Reminders",
    href: "/dashboard/reminders",
  },
  {
    icon: TrendingUp,
    label: "Analytics",
    href: "/dashboard/analytics",
  },
  {
    icon: HelpCircle,
    label: "Help",
    href: "/dashboard/help",
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({
  collapsed: controlledCollapsed,
  onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const sidebarContent = (
    <>
      <div
        className={cn(
          "flex h-14 items-center border-b border-neutral-200 dark:border-neutral-800",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="relative h-9 w-9 rounded-lg bg-linear-to-br from-[#A8BBA3] via-[#8FA58F] to-[#6B8E6B] flex items-center justify-center shadow-md shrink-0">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-lg font-bold bg-linear-to-r from-[#A8BBA3] to-[#6B8E6B] bg-clip-text text-transparent whitespace-nowrap overflow-hidden"
              >
                DocTracker
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors hidden md:flex"
          >
            <ChevronLeft className="h-4 w-4 text-neutral-500" />
          </button>
        )}
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        <div className={cn("space-y-1", collapsed ? "px-2" : "px-3")}>
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-lg transition-all duration-200 relative",
                  collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-[#A8BBA3]/10 text-[#A8BBA3]"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800",
                )}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-linear-to-b from-[#A8BBA3] to-[#8FA58F] rounded-r-full",
                      collapsed ? "h-6" : "h-8",
                    )}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon
                  className={cn(
                    "shrink-0",
                    collapsed ? "h-5 w-5" : "h-4 w-4",
                    isActive
                      ? "text-[#A8BBA3]"
                      : "text-neutral-500 group-hover:text-neutral-700 dark:text-neutral-400 dark:group-hover:text-neutral-300",
                  )}
                />
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>
      </div>

      {collapsed && (
        <div className="p-2 border-t border-neutral-200 dark:border-neutral-800 hidden md:block">
          <button
            onClick={() => setCollapsed(false)}
            className="w-full p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center"
          >
            <ChevronRight className="h-4 w-4 text-neutral-500" />
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
      </button>

      <aside
        className={cn(
          "hidden md:flex h-screen flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 fixed left-0 top-0 z-40 transition-all duration-300",
          collapsed ? "w-16" : "w-56",
        )}
      >
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-screen w-64 flex flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 z-50 md:hidden"
            >
              <div className="flex h-14 items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <div className="relative h-9 w-9 rounded-lg bg-linear-to-br from-[#A8BBA3] via-[#8FA58F] to-[#6B8E6B] flex items-center justify-center shadow-md">
                    <ShieldCheck className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-lg font-bold bg-linear-to-r from-[#A8BBA3] to-[#6B8E6B] bg-clip-text text-transparent">
                    DocTracker
                  </span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X className="h-5 w-5 text-neutral-500" />
                </button>
              </div>

              <div className="flex-1 py-4 px-3 overflow-y-auto">
                <div className="space-y-1">
                  {menuItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative",
                          isActive
                            ? "bg-[#A8BBA3]/10 text-[#A8BBA3]"
                            : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800",
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-linear-to-b from-[#A8BBA3] to-[#8FA58F] rounded-r-full" />
                        )}
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive
                              ? "text-[#A8BBA3]"
                              : "text-neutral-500 dark:text-neutral-400",
                          )}
                        />
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function getSidebarWidth(collapsed: boolean) {
  return collapsed ? 64 : 224;
}
