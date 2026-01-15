"use client";

import { motion } from "framer-motion";
import { Search, Plus, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface DashboardToolbarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    activeTab: "all" | "expiring" | "identity";
    setActiveTab: (tab: "all" | "expiring" | "identity") => void;
    onAddDocument: () => void;
}

export function DashboardToolbar({
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    onAddDocument,
}: DashboardToolbarProps) {
    const t = useTranslations("dashboard");
    
    return (
        <div className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-bold bg-linear-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
                        {t("documentsTitle")}
                    </h2>
                    <p className="text-neutral-500 text-sm mt-1">
                        {t("manageFiles")}
                    </p>
                </div>

                <div className="flex w-full md:w-auto gap-2">

                    <Button
                        onClick={onAddDocument}
                        className="flex-1 md:flex-none bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-full px-6 shadow-lg shadow-neutral-900/10 dark:shadow-white/5 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("addNew")}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 p-1.5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-neutral-600 dark:group-focus-within:text-neutral-300 transition-colors" />
                    <input
                        type="text"
                        placeholder={t("searchPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-transparent rounded-xl text-sm focus:outline-none placeholder:text-neutral-400 text-neutral-900 dark:text-neutral-100"
                    />
                </div>

                <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block self-center" />

                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {(["all", "expiring", "identity"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab
                                ? "text-neutral-900 dark:text-white"
                                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                                }`}
                        >
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 rounded-xl -z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            {tab === "all" && t("allItems")}
                            {tab === "expiring" && t("expiring")}
                            {tab === "identity" && t("identity")}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

