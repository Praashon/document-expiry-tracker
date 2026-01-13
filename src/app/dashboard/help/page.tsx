"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  HelpCircle,
  Book,
  MessageCircle,
  FileText,
  Shield,
  Bell,
  BarChart3,
  Loader2,
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
    description: "Learn how to add, edit, and organize your documents",
    questions: [
      "How do I add a new document?",
      "What document types can I track?",
      "How do I upload a file?",
    ],
  },
  {
    icon: Bell,
    title: "Reminders & Notifications",
    description: "Set up alerts for expiring documents",
    questions: [
      "How do reminders work?",
      "How do I enable email notifications?",
      "When will I be notified about expiring documents?",
    ],
  },
  {
    icon: Shield,
    title: "Security & Account",
    description: "Manage your account security settings",
    questions: [
      "How do I enable 2FA?",
      "How do I change my password?",
      "How do I update my profile?",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Understand your document statistics",
    questions: [
      "What does the analytics page show?",
      "How are document statuses determined?",
      "What do the different colors mean?",
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
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar />
      <div className="flex-1 md:ml-16">
        <Header user={user} sidebarCollapsed={true} />

        <main className="p-4 md:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 rounded-xl bg-[#A8BBA3]/10">
                <HelpCircle className="h-6 w-6 text-[#A8BBA3]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  Help & Support
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400">
                  Get help with DocTracker using our AI assistant
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* AI Chat - Main section */}
              <div className="lg:col-span-2 order-2 lg:order-1">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                  style={{ height: "600px" }}
                >
                  <AIChat floating={false} />
                </motion.div>
              </div>

              {/* Quick Help Topics */}
              <div className="order-1 lg:order-2 space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Book className="h-5 w-5 text-[#A8BBA3]" />
                    <h2 className="font-semibold text-neutral-900 dark:text-white">
                      Quick Help Topics
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
                              selectedQuestion === topic.title
                                ? null
                                : topic.title
                            )
                          }
                          className="w-full text-left p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-[#A8BBA3]/10 text-[#A8BBA3] group-hover:bg-[#A8BBA3]/20 transition-colors">
                              <topic.icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm text-neutral-900 dark:text-white">
                                {topic.title}
                              </h3>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                {topic.description}
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Expanded questions */}
                        {selectedQuestion === topic.title && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="ml-11 mt-2 space-y-1"
                          >
                            {topic.questions.map((question, qIndex) => (
                              <p
                                key={qIndex}
                                className="text-xs text-neutral-600 dark:text-neutral-400 py-1 px-2 rounded bg-neutral-50 dark:bg-neutral-800"
                              >
                                • {question}
                              </p>
                            ))}
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Info card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-br from-[#A8BBA3]/10 to-[#A8BBA3]/5 rounded-2xl border border-[#A8BBA3]/20 p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="h-5 w-5 text-[#A8BBA3]" />
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      AI Assistant
                    </h3>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Our AI assistant is trained specifically to help you with
                    DocTracker. Ask any question about managing documents,
                    settings, security features, or how to use the app.
                  </p>
                  <div className="mt-4 pt-4 border-t border-[#A8BBA3]/20">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="font-medium text-[#A8BBA3]">Tip:</span>{" "}
                      The assistant only answers questions about DocTracker to
                      give you the most relevant help.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default function HelpPage() {
  return <HelpPageContent />;
}
