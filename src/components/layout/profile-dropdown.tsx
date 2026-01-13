"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Settings,
  Shield,
  LogOut,
  ChevronDown,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/lib/auth-actions";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface ProfileDropdownProps {
  user: SupabaseUser | null;
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const identities = user?.identities || [];
  const googleIdentity = identities.find(
    (i: { provider?: string }) => i.provider === "google",
  ) as
    | {
      provider?: string;
      identity_data?: {
        name?: string;
        full_name?: string;
        avatar_url?: string;
        picture?: string;
      };
    }
    | undefined;

  const userName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    googleIdentity?.identity_data?.name ||
    googleIdentity?.identity_data?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  const userEmail = user?.email || "";

  const userAvatar =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    googleIdentity?.identity_data?.avatar_url ||
    googleIdentity?.identity_data?.picture ||
    "";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProfileClick = () => {
    setIsOpen(false);
    router.push("/dashboard/profile?tab=profile");
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    router.push("/dashboard/profile?tab=settings");
  };

  const handleSecurityClick = () => {
    setIsOpen(false);
    router.push("/dashboard/profile?tab=security");
  };

  const handleLogout = () => {
    setIsOpen(false);
    logoutUser();
  };

  const menuItems = [
    {
      icon: User,
      label: "Profile",
      onClick: handleProfileClick,
    },
    {
      icon: Settings,
      label: "Settings",
      onClick: handleSettingsClick,
    },
    {
      icon: Shield,
      label: "Security",
      onClick: handleSecurityClick,
    },
    {
      icon: LogOut,
      label: "Logout",
      onClick: handleLogout,
      variant: "danger" as const,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 h-auto hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="h-8 w-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-linear-to-tr from-[#A8BBA3] to-[#8FA58F] flex items-center justify-center text-white text-sm font-bold shadow-md">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-neutral-900" />
          </div>

          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {userName}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[120px]">
              {userEmail}
            </span>
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-neutral-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex items-center gap-3">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="h-10 w-10 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-linear-to-tr from-[#A8BBA3] to-[#8FA58F] flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {userEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className="py-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${item.variant === "danger"
                      ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10"
                      : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                >
                  <item.icon
                    className={`h-4 w-4 ${item.variant === "danger"
                        ? "text-red-500"
                        : "text-neutral-500 dark:text-neutral-400"
                      }`}
                  />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex items-center justify-center gap-1">
                <Building2 className="h-3 w-3 text-neutral-400" />
                <p className="text-xs text-neutral-400 text-center">
                  DocTracker v1.0
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
