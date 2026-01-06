"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAuth } from "@/lib/auth-actions";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { RecentDocs } from "@/components/dashboard/recent-docs";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [refresh, setRefresh] = useState(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // Handle successful upload
        console.log("File uploaded successfully");
        setFile(null);
        setRefresh(!refresh);
        // You might want to refresh the recent documents list here
      } else {
        // Handle error
        console.error("Error uploading file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
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
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Dashboard
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                Welcome back, heres an overview of your documents.
              </p>
            </div>

            <StatsGrid refresh={refresh} />

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
              <RecentDocs refresh={refresh} />
              <div className="col-span-1 lg:col-span-2 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Quick Actions
                </h3>
                <form onSubmit={handleUpload} className="mt-4">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#A8BBA3]/10 file:text-[#A8BBA3] hover:file:bg-[#A8BBA3]/20"
                  />
                  <button
                    type="submit"
                    className="mt-4 w-full bg-[#A8BBA3] text-white rounded-md px-4 py-2 text-sm font-semibold shadow-sm hover:bg-[#97a992] disabled:opacity-50"
                    disabled={!file}
                  >
                    Upload
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
