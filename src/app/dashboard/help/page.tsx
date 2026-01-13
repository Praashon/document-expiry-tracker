"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Book,
  MessageCircle,
  FileText,
  Shield,
  Bell,
  BarChart3,
  Loader2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { AIChat } from "@/components/chat/ai-chat";
import { checkAuth } from "@/lib/auth-actions";

const QUICK_HELP_TOPICS = [
  {
    icon: FileText,
    title: "Document Management",
    description: "Adding, editing, and organizing your files",
    questions: [
      "How do I add a new document?",
      "What document types can I track?",
      "How do I upload a file?",
    ],
  },
  {
    icon: Bell,
    title: "Reminders",
    description: "Setting up alerts for expiring docs",
    questions: [
      "How do reminders work?",
      "How do I enable email notifications?",
      "When will I be notified?",
    ],
  },
  {
    icon: Shield,
    title: "Security",
    description: "Account protection and privacy",
    questions: [
      "How do I enable 2FA?",
      "How do I change my password?",
      "Data privacy information",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Understanding your document stats",
    questions: [
      "What does the analytics page show?",
      "How are statuses determined?",
      "Color coding guide",
    ],
  },
];

function HelpPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const currentUser = await checkAuth();
      if (!currentUser) {
        router.push("/login");
      } else {
        setIsLoading(false);
      }
    };

    if (!loading) {
      if (user) {
        setIsLoading(false);
      } else {
        check();
      }
    }
  }, [loading, user, router]);

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

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />
      <div className="flex-1 md:ml-16">
        <Header user={user} sidebarCollapsed={true} />

        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="mb-8 relative overflow-hidden rounded-3xl bg-neutral-900 px-8 py-10 dark:bg-neutral-900 border border-neutral-800">
            <div className="absolute top-0 right-0 p-12 opacity-10">
              <HelpCircle className="w-64 h-64 text-white" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Help Center & Support
                </h1>
                <p className="text-neutral-400 max-w-xl text-lg">
                  Find answers, troubleshoot issues, and get the most out of DocTracker with our AI assistant.
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-sm font-medium">
                <Sparkles className="w-4 h-4 text-[#A8BBA3]" />
                <span>AI-Powered Assistant</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)] min-h-[400px]">
            {/* Main Content - AI Chat (8 cols) */}
            <div className="lg:col-span-8 order-2 lg:order-1 h-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="h-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm flex flex-col"
              >
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#A8BBA3]/20 to-[#A8BBA3]/10 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-[#A8BBA3]" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-neutral-900 dark:text-white">Assistant</h2>
                      <p className="text-xs text-neutral-500">Always online</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 relative">
                  <AIChat floating={false} />
                </div>
              </motion.div>
            </div>

            {/* Sidebar - Quick Topics (4 cols) */}
            <div className="lg:col-span-4 order-1 lg:order-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Book className="h-5 w-5 text-[#A8BBA3]" />
                  <h2 className="font-semibold text-lg text-neutral-900 dark:text-white">
                    Quick Topics
                  </h2>
                </div>

                <div className="space-y-3">
                  {QUICK_HELP_TOPICS.map((topic, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * (index + 3) }}
                      className="group"
                    >
                      <button
                        onClick={() =>
                          setSelectedQuestion(
                            selectedQuestion === topic.title ? null : topic.title
                          )
                        }
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${selectedQuestion === topic.title
                          ? "bg-white dark:bg-neutral-800 border-[#A8BBA3]/50 shadow-md ring-1 ring-[#A8BBA3]/20"
                          : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-[#A8BBA3]/30 hover:shadow-sm"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${selectedQuestion === topic.title
                              ? "bg-[#A8BBA3] text-white"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 group-hover:text-[#A8BBA3]"
                              }`}>
                              <topic.icon className="h-4 w-4" />
                            </div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white">
                              {topic.title}
                            </h3>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-neutral-400 transition-transform duration-300 ${selectedQuestion === topic.title ? "rotate-90" : ""}`} />
                        </div>

                        <p className="text-xs text-neutral-500 dark:text-neutral-400 pl-[52px]">
                          {topic.description}
                        </p>

                        <AnimatePresence>
                          {selectedQuestion === topic.title && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-4 pl-[52px] space-y-2">
                                {topic.questions.map((q, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#A8BBA3] mt-1.5 shrink-0" />
                                    <span>{q}</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>            {/* Main Content - AI Chat (8 cols) */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function HelpPage() {
  return <HelpPageContent />;
}
