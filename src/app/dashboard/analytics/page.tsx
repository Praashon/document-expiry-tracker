"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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
        now.getTime() + 30 * 24 * 60 * 60 * 1000
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

      // Set category data
      const catData: CategoryData[] = Object.entries(categoryCounts).map(
        ([category, count]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          count,
          color: categoryColors[category] || categoryColors.other,
        })
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
              new Date(a.created_at).getTime()
          )
          .slice(0, 5)
          .map((doc) => ({
            action: "Added",
            document: doc.name,
            date: new Date(doc.created_at).toLocaleDateString(),
          })) || [];
      setRecentActivity(recentDocs);
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
        <div className="flex-1 md:ml-72">
          <Header user={user} />
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-[#A8BBA3]" />
          </div>
        </div>
      </div>
    );
  }

  const maxMonthlyValue = Math.max(
    ...monthlyData.map((d) => Math.max(d.added, d.expired)),
    1
  );
  const totalCategoryCount = categoryData.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar />

      <div className="flex-1 md:ml-72">
        <Header user={user} />

        <main className="p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-[#A8BBA3]/10 dark:bg-[#A8BBA3]/20">
                <TrendingUp className="h-6 w-6 text-[#A8BBA3]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  Analytics Overview
                </h1>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Track your document statistics and trends
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                title: "Total Documents",
                value: stats.total,
                icon: FileText,
                color: "text-blue-600",
                bgColor: "bg-blue-100 dark:bg-blue-900/20",
                trend: null,
              },
              {
                title: "Active",
                value: stats.active,
                icon: CheckCircle,
                color: "text-green-600",
                bgColor: "bg-green-100 dark:bg-green-900/20",
                trend: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0,
                trendUp: true,
              },
              {
                title: "Expiring Soon",
                value: stats.expiringSoon,
                icon: Clock,
                color: "text-orange-600",
                bgColor: "bg-orange-100 dark:bg-orange-900/20",
                trend: stats.total > 0 ? Math.round((stats.expiringSoon / stats.total) * 100) : 0,
                trendUp: false,
              },
              {
                title: "Expired",
                value: stats.expired,
                icon: AlertCircle,
                color: "text-red-600",
                bgColor: "bg-red-100 dark:bg-red-900/20",
                trend: stats.total > 0 ? Math.round((stats.expired / stats.total) * 100) : 0,
                trendUp: false,
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      {stat.trend !== null && (
                        <div
                          className={`flex items-center gap-1 text-xs font-medium ${
                            stat.trendUp ? "text-green-600" : "text-orange-600"
                          }`}
                        >
                          {stat.trendUp ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {stat.trend}%
                        </div>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-neutral-500">{stat.title}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Trend Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#A8BBA3]" />
                    Monthly Trends
                  </CardTitle>
                  <CardDescription>
                    Documents added and expired over the last 6 months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {monthlyData.map((data, index) => (
                      <div key={data.month} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">
                            {data.month}
                          </span>
                          <span className="text-neutral-500 text-xs">
                            +{data.added} / -{data.expired}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 h-6 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(data.added / maxMonthlyValue) * 100}%`,
                              }}
                              transition={{ delay: index * 0.1, duration: 0.5 }}
                              className="h-full bg-gradient-to-r from-[#A8BBA3] to-[#8FA58F] rounded-full"
                            />
                          </div>
                          <div className="flex-1 h-6 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(data.expired / maxMonthlyValue) * 100}%`,
                              }}
                              transition={{ delay: index * 0.1, duration: 0.5 }}
                              className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-center gap-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#A8BBA3]" />
                        <span className="text-xs text-neutral-500">Added</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <span className="text-xs text-neutral-500">Expired</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Category Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-[#A8BBA3]" />
                    Document Categories
                  </CardTitle>
                  <CardDescription>
                    Distribution of documents by type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryData.length > 0 ? (
                    <div className="space-y-4">
                      {categoryData.map((cat, index) => (
                        <div key={cat.category} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-neutral-700 dark:text-neutral-300">
                              {cat.category}
                            </span>
                            <span className="text-neutral-500">
                              {cat.count} (
                              {Math.round((cat.count / totalCategoryCount) * 100)}
                              %)
                            </span>
                          </div>
                          <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(cat.count / totalCategoryCount) * 100}%`,
                              }}
                              transition={{ delay: index * 0.1, duration: 0.5 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-neutral-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No documents yet</p>
                      <p className="text-sm">
                        Add documents to see category distribution
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#A8BBA3]" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest document additions and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-[#A8BBA3]/10">
                            <FileText className="h-4 w-4 text-[#A8BBA3]" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white text-sm">
                              {activity.document}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {activity.action}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-neutral-500">
                          {activity.date}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm">Your document activity will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
