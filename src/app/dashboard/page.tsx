"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAuth, logoutUser } from "@/lib/auth-actions";
import { Loader2, LogOut } from "lucide-react";
import { Models } from "appwrite";

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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white">
      <header className="bg-white dark:bg-neutral-900 shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600 dark:text-neutral-400 hidden sm:block">
              Welcome, {user?.name}
            </span>
            <button
              onClick={logoutUser}
              className="flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold text-white bg-[#A8BBA3] hover:bg-[#92a88d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A8BBA3] transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Dashboard content goes here */}
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg h-96 p-4 text-center">
              <h2 className="text-xl font-semibold mb-2">
                Document Expiration Tracker
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                This is where you will see your list of documents. We will build
                this part next.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
