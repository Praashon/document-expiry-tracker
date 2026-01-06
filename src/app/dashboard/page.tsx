"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAuth } from "@/lib/auth-actions";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { RecentDocs } from "@/components/dashboard/recent-docs";
import { AddDocumentModal } from "@/components/dashboard/add-document-modal";
import { Loader2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

  const handleDocumentAdded = () => {
    setRefresh(!refresh);
  };

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  Dashboard
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                  Welcome back, here&apos;s an overview of your documents.
                </p>
              </div>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Document
              </Button>
            </div>

            <StatsGrid refresh={refresh} />

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
              <RecentDocs refresh={refresh} />
              <div className="col-span-1 lg:col-span-2 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Quick Actions
                </h3>
                <div className="mt-4 space-y-3">
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-[#A8BBA3] hover:bg-[#A8BBA3]/5 transition-colors text-left"
                  >
                    <div className="p-2 bg-[#A8BBA3]/10 rounded-lg">
                      <Plus className="w-4 h-4 text-[#A8BBA3]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        Add New Document
                      </p>
                      <p className="text-xs text-neutral-500">
                        Track a new document expiration
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Add Document Modal */}
      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleDocumentAdded}
      />
    </div>
  );
}
