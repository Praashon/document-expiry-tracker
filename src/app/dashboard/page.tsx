"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAuth } from "@/lib/auth-actions";
import { Models } from "appwrite";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { RecentDocs } from "@/components/dashboard/recent-docs";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const currentUser = await checkAuth();
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        setIsLoading(false);
      }
    };
    check();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-12 h-12 animate-spin text-[#A8BBA3]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-64 transition-[margin] duration-300 ease-in-out">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-7xl space-y-8"
          >
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Dashboard
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                Welcome back, here's an overview of your documents.
              </p>
            </div>

            <StatsGrid />

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
              <RecentDocs />
              {/* Placeholder for another widget or chart if needed later */}
              <div className="col-span-1 lg:col-span-2 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-[#A8BBA3]/10 flex items-center justify-center mb-4">
                    <Loader2 className="w-6 h-6 text-[#A8BBA3]" />
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Quick Actions</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Coming Soon</p>
                </div>
              </div>
            </div>

          </motion.div>
        </main>
      </div>
    </div>
  );
}
