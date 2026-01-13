"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  Clock,
  AlertTriangle,
  Loader2,
  FileText,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useToast } from "@/components/ui/toast";
import { EditDocumentModal } from "@/components/dashboard/edit-document-modal";
import { DeleteConfirmModal } from "@/components/dashboard/delete-confirm-modal";
import { ViewDocumentModal } from "@/components/dashboard/view-document-modal";
import { checkAuth } from "@/lib/auth-actions";
import { AIChat } from "@/components/chat/ai-chat";
import {
  getDocuments,
  getDocumentStatus,
  getDaysUntilExpiration,
  getFileDownloadUrl,
  type Document,
} from "@/lib/document-actions";
import type { User } from "@supabase/supabase-js";
import { DocumentGrid } from "@/components/dashboard/document-grid";

export default function RemindersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [filter, setFilter] = useState<"all" | "expired" | "expiring_soon">(
    "all",
  );
  const router = useRouter();

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );

  useEffect(() => {
    const check = async () => {
      const currentUser = await checkAuth();
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        await fetchDocuments(currentUser.id);
      }
    };
    check();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchDocuments(user.id);
    }
  }, [refresh, user]);

  const fetchDocuments = async (userId: string) => {
    try {
      const docs = await getDocuments(userId);
      setDocuments(docs as Document[]);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefresh(!refresh);
  };

  // Filter documents for reminders (only those with expiration dates)
  const reminderDocuments = documents.filter((doc) => {
    if (!doc.expiration_date) return false;

    const status = getDocumentStatus(doc.expiration_date);

    if (filter === "expired") return status === "expired";
    if (filter === "expiring_soon") return status === "expiring_soon";

    // For "all", show expired and expiring soon
    return status === "expired" || status === "expiring_soon";
  });

  // Sort by urgency (expired first, then by days until expiration)
  const sortedDocuments = reminderDocuments.sort((a, b) => {
    const statusA = getDocumentStatus(a.expiration_date);
    const statusB = getDocumentStatus(b.expiration_date);

    if (statusA === "expired" && statusB !== "expired") return -1;
    if (statusB === "expired" && statusA !== "expired") return 1;

    const daysA = getDaysUntilExpiration(a.expiration_date);
    const daysB = getDaysUntilExpiration(b.expiration_date);

    if (daysA === null && daysB === null) return 0;
    if (daysA === null) return 1;
    if (daysB === null) return -1;

    return Math.abs(daysA) - Math.abs(daysB);
  });

  const stats = {
    total: reminderDocuments.length,
    expired: reminderDocuments.filter(
      (doc) => getDocumentStatus(doc.expiration_date) === "expired",
    ).length,
    expiringSoon: reminderDocuments.filter(
      (doc) => getDocumentStatus(doc.expiration_date) === "expiring_soon",
    ).length,
  };

  const handleView = (document: Document) => {
    setSelectedDocument(document);
    setIsViewModalOpen(true);
  };

  const handleEdit = (document: Document) => {
    setSelectedDocument(document);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (document: Document) => {
    setSelectedDocument(document);
    setIsDeleteModalOpen(true);
  };

  const handleDownload = async (document: Document) => {
    if (!document.file_path) {
      addToast({
        type: "warning",
        title: "No File Available",
        message: "This document does not have an attached file to download.",
      });
      return;
    }

    try {
      const downloadUrl = await getFileDownloadUrl(document.file_path);
      window.open(downloadUrl, "_blank");
      addToast({
        type: "success",
        title: "Download Started",
        message: "Your document download has been initiated successfully.",
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      addToast({
        type: "error",
        title: "Download Failed",
        message:
          "Unable to download the file. Please try again or contact support.",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDocument) return;

    const documentToDelete = selectedDocument;
    const documentTitle = documentToDelete.title;

    setDocuments((prevDocs) =>
      prevDocs.filter((doc) => doc.id !== documentToDelete.id),
    );
    setIsDeleteModalOpen(false);
    setSelectedDocument(null);

    try {
      const response = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        addToast({
          type: "success",
          title: "Document Deleted",
          message: `"${documentTitle}" has been permanently removed.`,
        });
      } else {
        setDocuments((prevDocs) => [...prevDocs, documentToDelete]);
        addToast({
          type: "error",
          title: "Deletion Failed",
          message: "Could not delete the document. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      setDocuments((prevDocs) => [...prevDocs, documentToDelete]);
      addToast({
        type: "error",
        title: "Deletion Failed",
        message: "An error occurred while deleting. Please try again.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Sidebar />
        <div className="flex-1 md:ml-16">
          <Header user={user} sidebarCollapsed={true} />
          <div className="flex items-center justify-center h-96">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="h-8 w-8 animate-spin text-[#A8BBA3]" />
              <p className="text-neutral-600 dark:text-neutral-400">
                Loading reminders...
              </p>
            </motion.div>
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

        <main className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/20">
                <Bell className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-linear-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
                  Expiration Alerts
                </h1>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Monitor document expiration dates and renewals
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/10">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                    {stats.total}
                  </p>
                  <p className="text-sm font-medium text-neutral-500">Active Alerts</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/10">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-600">
                    {stats.expired}
                  </p>
                  <p className="text-sm font-medium text-neutral-500">Overdue</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-900/10">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-orange-600">
                    {stats.expiringSoon}
                  </p>
                  <p className="text-sm font-medium text-neutral-500">Renewal Required</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Styled Filter Tabs */}
          <div className="flex bg-white dark:bg-neutral-900 w-fit p-1 rounded-2xl border border-neutral-200 dark:border-neutral-800 mb-8 shadow-sm">
            {(["all", "expired", "expiring_soon"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${filter === tab
                  ? "text-neutral-900 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
              >
                {filter === tab && (
                  <motion.div
                    layoutId="reminderTab"
                    className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 rounded-xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {tab === "all" && "All Alerts"}
                {tab === "expired" && "Overdue"}
                {tab === "expiring_soon" && "Renewal Required"}
              </button>
            ))}
          </div>

          {/* New DocumentGrid used for Reminders */}
          <DocumentGrid
            documents={sortedDocuments}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onDownload={handleDownload}
          />
        </main>
      </div>

      {/* Modals */}
      <EditDocumentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleRefresh}
        document={selectedDocument}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        documentTitle={selectedDocument?.title || ""}
      />

      <ViewDocumentModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        document={selectedDocument}
      />

      {/* Floating AI Chat */}
      <AIChat />
    </div>
  );
}
