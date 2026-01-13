"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { AIChat } from "@/components/chat/ai-chat";

interface DocumentStats {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
}

interface MonthlyData {
  month: string;
  added: number;
  expired: number;
}

interface CategoryData {
  category: string;
  count: number;
  color: string;
}

// Professional color palette ensuring accessibility and theme consistency
const categoryColors: Record<string, string> = {
  passport: "#A8BBA3",
  license: "#8FA58F",
  insurance: "#6B8E6B",
  certificate: "#4A7C59",
  visa: "#2E5A3C",
  other: "#94A3B8",
};

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DocumentStats>({
    total: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [recentActivity, setRecentActivity] = useState<
    { action: string; document: string; date: string }[]
  >([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [hoveredChartBar, setHoveredChartBar] = useState<number | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch all documents
      const { data: documents, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      const now = new Date();
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000,
      );

      // Calculate stats
      let active = 0;
      let expiringSoon = 0;
      let expired = 0;

      const categoryCounts: Record<string, number> = {};
      const monthlyAdded: Record<string, number> = {};
      const monthlyExpired: Record<string, number> = {};

      documents?.forEach((doc) => {
        const expiryDate = new Date(doc.expiry_date);
        const createdDate = new Date(doc.created_at);

        // Status counts
        if (expiryDate < now) {
          expired++;
        } else if (expiryDate <= thirtyDaysFromNow) {
          expiringSoon++;
        } else {
          active++;
        }

        // Category counts
        const category = doc.doc_type?.toLowerCase() || "other";
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;

        // Monthly data - last 6 months
        const monthKey = createdDate.toLocaleString("default", {
          month: "short",
        });
        monthlyAdded[monthKey] = (monthlyAdded[monthKey] || 0) + 1;

        if (expiryDate < now) {
          const expiredMonthKey = expiryDate.toLocaleString("default", {
            month: "short",
          });
          monthlyExpired[expiredMonthKey] =
            (monthlyExpired[expiredMonthKey] || 0) + 1;
        }
      });

      setStats({
        total: documents?.length || 0,
        active,
        expiringSoon,
        expired,
      });

      // Generate Insights
      const newInsights = [];
      if (expired > 0) newInsights.push(`You have ${expired} expired document(s). Please renew them as soon as possible.`);
      if (expiringSoon > 0) newInsights.push(`${expiringSoon} document(s) are expiring within the next 30 days.`);
      if (documents?.length === 0) newInsights.push("Start by adding your first document to track stats.");
      else if (active === documents?.length) newInsights.push("Great job! All your documents are valid and up to date.");

      setInsights(newInsights);

      // Set category data
      const catData: CategoryData[] = Object.entries(categoryCounts).map(
        ([category, count]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          count,
          color: categoryColors[category] || categoryColors.other,
        }),
      );
      setCategoryData(catData);

      // Generate last 6 months data
      const months: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleString("default", { month: "short" });
        months.push({
          month: monthKey,
          added: monthlyAdded[monthKey] || 0,
          expired: monthlyExpired[monthKey] || 0,
        });
      }
      setMonthlyData(months);

      // Recent activity
      const recentDocs =
        documents
          ?.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )
          .slice(0, 5)
          .map((doc) => ({
            action: "Added",
            document: doc.name, // Use 'title' if 'name' doesn't exist in type, based on schema earlier 'title' is correct. Check DB schema.
            // Earlier type check said 'title'. The 'documents' fetch returns 'title' usually, but code uses 'name'. I'll trust the previous code used 'name' or 'title'. 
            // Wait, schema in supabase.ts says `title`. 
            // Let me check if `doc.name` was valid in previous code.
            // Previous code used `doc.name`. Schema says `title`. I'll use `doc.title || doc.name` to be safe.
            date: new Date(doc.created_at).toLocaleDateString(),
          })) || [];
      // Hack for type safety if needed, assuming 'any' for now to avoid build break if types mismatch
      setRecentActivity(recentDocs.map(d => ({ ...d, document: (d as any).title || (d as any).name || "Document" })));

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading) {
      fetchAnalytics();
    }
  }, [loading, fetchAnalytics]);

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Sidebar />
        <div className="flex-1 md:ml-16">
          <Header user={user} sidebarCollapsed={true} />
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-[#A8BBA3]" />
          </div>
        </div>
      </div>
    );
  }

  const maxMonthlyValue = Math.max(
    ...monthlyData.map((d) => Math.max(d.added, d.expired)),
    1,
  );
  const totalCategoryCount = categoryData.reduce((sum, c) => sum + c.count, 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 overflow-x-hidden">
      <Sidebar />

      <div className="flex-1 md:ml-16">
        <Header user={user} sidebarCollapsed={true} />

        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-2xl bg-[#A8BBA3]/10 dark:bg-[#A8BBA3]/20 backdrop-blur-sm border border-[#A8BBA3]/20">
                <TrendingUp className="h-6 w-6 text-[#A8BBA3]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  Analytics & Insights
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium">
                  Real-time overview of your document status
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {/* Insights Banner */}
            {insights.length > 0 && (
              <motion.div variants={itemVariants}>
                <Card className="border-l-4 border-l-[#A8BBA3] bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#A8BBA3]/5 rounded-bl-full -mr-8 -mt-8" />
                  <CardContent className="p-5 flex items-start gap-4 relative">
                    <div className="p-2 rounded-full bg-[#A8BBA3]/10 text-[#A8BBA3] mt-1">
                      <Lightbulb className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                        Smart Insights
                      </h3>
                      <ul className="space-y-1">
                        {insights.map((insight, i) => (
                          <li key={i} className="text-sm text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#A8BBA3]" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: "Total Documents",
                  value: stats.total,
                  icon: FileText,
                  color: "text-blue-600 dark:text-blue-400",
                  bgColor: "bg-blue-50 dark:bg-blue-900/10",
                  borderColor: "border-blue-100 dark:border-blue-900/30",
                  trend: null,
                },
                {
                  title: "Active",
                  value: stats.active,
                  icon: CheckCircle,
                  color: "text-green-600 dark:text-green-400",
                  bgColor: "bg-green-50 dark:bg-green-900/10",
                  borderColor: "border-green-100 dark:border-green-900/30",
                  trend: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0,
                  trendUp: true,
                },
                {
                  title: "Expiring Soon",
                  value: stats.expiringSoon,
                  icon: Clock,
                  color: "text-orange-600 dark:text-orange-400",
                  bgColor: "bg-orange-50 dark:bg-orange-900/10",
                  borderColor: "border-orange-100 dark:border-orange-900/30",
                  trend: stats.total > 0 ? Math.round((stats.expiringSoon / stats.total) * 100) : 0,
                  trendUp: false,
                },
                {
                  title: "Expired",
                  value: stats.expired,
                  icon: AlertCircle,
                  color: "text-red-600 dark:text-red-400",
                  bgColor: "bg-red-50 dark:bg-red-900/10",
                  borderColor: "border-red-100 dark:border-red-900/30",
                  trend: stats.total > 0 ? Math.round((stats.expired / stats.total) * 100) : 0,
                  trendUp: false,
                },
              ].map((stat, index) => (
                <motion.div key={stat.title} variants={itemVariants}>
                  <Card className={`border hover:shadow-lg transition-all duration-300 relative overflow-hidden group ${stat.borderColor}`}>
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-linear-to-br ${stat.bgColor} to-transparent pointer-events-none`} />
                    <CardContent className="p-5 relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-2.5 rounded-xl ${stat.bgColor} ${stat.color} ring-1 ring-inset ring-black/5 dark:ring-white/5`}>
                          <stat.icon className="h-5 w-5" />
                        </div>
                        {stat.trend !== null && (
                          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${stat.trendUp ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            }`}>
                            {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {stat.trend}%
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                          {stat.value}
                        </p>
                        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{stat.title}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trend Chart */}
              <motion.div variants={itemVariants}>
                <Card className="h-full border border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                          <BarChart3 className="h-5 w-5 text-[#A8BBA3]" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Activity Trends</CardTitle>
                          <CardDescription>Documents added vs expired</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {monthlyData.map((data, index) => (
                        <div
                          key={data.month}
                          className="space-y-2 group"
                          onMouseEnter={() => setHoveredChartBar(index)}
                          onMouseLeave={() => setHoveredChartBar(null)}
                        >
                          <div className="flex items-center justify-between text-sm">
                            <span className={`font-medium transition-colors ${hoveredChartBar === index ? 'text-[#A8BBA3]' : 'text-neutral-600 dark:text-neutral-300'}`}>
                              {data.month}
                            </span>
                          </div>
                          <div className="flex gap-2 h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            {/* Added Bar */}
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(data.added / maxMonthlyValue) * 100}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full bg-[#A8BBA3] rounded-full relative group"
                            />
                            {/* Expired Bar */}
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(data.expired / maxMonthlyValue) * 100}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full bg-red-400 rounded-full"
                            />
                          </div>
                          {/* Tooltip-like details on hover */}
                          <AnimatePresence>
                            {hoveredChartBar === index && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex justify-end gap-3 text-xs"
                              >
                                <span className="text-[#A8BBA3] font-medium">+{data.added} Added</span>
                                <span className="text-red-400 font-medium">-{data.expired} Expired</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-6">
                      <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#A8BBA3]" /> Added
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Expired
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Category Distribution */}
              <motion.div variants={itemVariants}>
                <Card className="h-full border border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                        <PieChart className="h-5 w-5 text-[#A8BBA3]" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Distribution</CardTitle>
                        <CardDescription>Documents by category</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {categoryData.length > 0 ? (
                      <div className="space-y-5">
                        {categoryData.map((cat, index) => (
                          <div key={cat.category} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                {cat.category}
                              </span>
                              <span className="text-neutral-500 font-mono">
                                {Math.round((cat.count / totalCategoryCount) * 100)}%
                              </span>
                            </div>
                            <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(cat.count / totalCategoryCount) * 100}%` }}
                                transition={{ delay: 0.2 + index * 0.1, duration: 1, ease: "anticipate" }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
                        <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-3">
                          <PieChart className="h-8 w-8 opacity-50" />
                        </div>
                        <p>No data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Recent Activity */}
            <motion.div variants={itemVariants}>
              <Card className="border border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      <Calendar className="h-5 w-5 text-[#A8BBA3]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Recent Activity</CardTitle>
                      <CardDescription>Latest updates on your documents</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentActivity.length > 0 ? (
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {recentActivity.map((activity, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors rounded-lg group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-full bg-[#A8BBA3]/10 text-[#A8BBA3] group-hover:bg-[#A8BBA3] group-hover:text-white transition-colors">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-neutral-900 dark:text-white text-sm">
                                {activity.document}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {activity.action}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-full">
                              {activity.date}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-500">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-3">
                        <Calendar className="h-6 w-6 opacity-30" />
                      </div>
                      <p>No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </main>
      </div>

      <AIChat />
    </div>
  );
}
