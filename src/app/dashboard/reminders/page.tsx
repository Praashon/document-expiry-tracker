"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Download,
  MoreVertical,
  FileText,
  Home,
  CreditCard,
  Car,
  ScrollText,
  Vote,
  Bookmark,
  FileCheck,
  Package,
  Shield,
  Loader2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
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
  type DocumentStatus,
  type DocumentType,
} from "@/lib/document-actions";
import { DOCUMENT_TYPE_CONFIG } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/toast";

const TYPE_ICONS: Record<DocumentType, React.ElementType> = {
  "Rent Agreement": Home,
  Insurance: Shield,
  Subscription: Bookmark,
  License: FileCheck,
  Warranty: Package,
  Contract: ScrollText,
  Citizenship: FileText,
  "PAN Card": CreditCard,
  "National ID": CreditCard,
  Passport: FileText,
  "Driving License": Car,
  "Voter ID": Vote,
  "Birth Certificate": ScrollText,
  Other: FileText,
};

function StatusBadge({ status }: { status: DocumentStatus }) {
  const config = {
    valid: {
      icon: CheckCircle,
      text: "Valid",
      className:
        "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    },
    expiring_soon: {
      icon: Clock,
      text: "Expiring Soon",
      className:
        "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
    },
    expired: {
      icon: AlertTriangle,
      text: "Expired",
      className: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    },
    no_expiry: {
      icon: Shield,
      text: "Permanent",
      className:
        "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    },
  };

  const statusConfig = config[status] || config.valid;
  const { icon: Icon, text, className } = statusConfig;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${className}`}
    >
      <Icon className="h-4 w-4" />
      {text}
    </span>
  );
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "Not set";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

  // Dropdown state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    setOpenMenuId(null);
  };

  const handleEdit = (document: Document) => {
    setSelectedDocument(document);
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDeleteClick = (document: Document) => {
    setSelectedDocument(document);
    setIsDeleteModalOpen(true);
    setOpenMenuId(null);
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
      setOpenMenuId(null);
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

    try {
      const response = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedDocument.id }),
      });
      const data = await response.json();

      if (data.success) {
        handleRefresh();
        setIsDeleteModalOpen(false);
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
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
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
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
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  Document Expiration Alerts
                </h1>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Monitor document expiration dates and renewal requirements
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {stats.total}
                  </p>
                  <p className="text-sm text-neutral-500">Active Alerts</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.expired}
                  </p>
                  <p className="text-sm text-neutral-500">Overdue</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.expiringSoon}
                  </p>
                  <p className="text-sm text-neutral-500">Renewal Required</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className="relative"
            >
              All Alerts
              {filter === "all" && (
                <motion.div
                  layoutId="reminder-filter"
                  className="absolute inset-0 bg-[#A8BBA3] rounded-md"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Button>
            <Button
              variant={filter === "expired" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("expired")}
              className="relative"
            >
              Overdue
              {filter === "expired" && (
                <motion.div
                  layoutId="reminder-filter"
                  className="absolute inset-0 bg-red-500 rounded-md"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Button>
            <Button
              variant={filter === "expiring_soon" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("expiring_soon")}
              className="relative"
            >
              Renewal Required
              {filter === "expiring_soon" && (
                <motion.div
                  layoutId="reminder-filter"
                  className="absolute inset-0 bg-orange-500 rounded-md"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Button>
          </div>

          {/* Documents List */}
          {sortedDocuments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="mb-4">
                <Bell className="h-12 w-12 text-neutral-400 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                No alerts found
              </h3>
              <p className="text-neutral-500 mb-6">
                {filter === "all"
                  ? "All documents are current and compliant"
                  : filter === "expired"
                    ? "No overdue documents requiring attention"
                    : "No documents require immediate renewal"}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {sortedDocuments.map((doc, index) => {
                  const status = getDocumentStatus(doc.expiration_date);
                  const daysUntil = getDaysUntilExpiration(doc.expiration_date);
                  const config = DOCUMENT_TYPE_CONFIG[doc.type as DocumentType];
                  const TypeIcon =
                    TYPE_ICONS[doc.type as DocumentType] || FileText;

                  return (
                    <motion.div
                      key={doc.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`bg-white dark:bg-neutral-900 rounded-xl p-4 border-l-4 border shadow-sm hover:shadow-md transition-shadow ${
                        status === "expired"
                          ? "border-l-red-500 bg-red-50/50 dark:bg-red-900/10"
                          : "border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10"
                      } border-r border-t border-b border-neutral-200 dark:border-neutral-800`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div
                            className={`p-3 rounded-xl ${
                              config?.bgColor ||
                              "bg-neutral-100 dark:bg-neutral-800"
                            }`}
                          >
                            <TypeIcon
                              className={`h-6 w-6 ${
                                config?.color || "text-neutral-600"
                              }`}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                              {doc.title}
                            </h3>
                            <p className="text-sm text-neutral-500 mb-2">
                              {doc.type}
                              {doc.document_number && (
                                <span className="ml-2 text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                                  #{doc.document_number}
                                </span>
                              )}
                            </p>

                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1 text-neutral-500">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Expires: {formatDate(doc.expiration_date)}
                                </span>
                              </div>
                              {daysUntil !== null && (
                                <span
                                  className={`font-medium ${
                                    daysUntil < 0
                                      ? "text-red-600"
                                      : daysUntil <= 30
                                        ? "text-orange-600"
                                        : "text-neutral-600"
                                  }`}
                                >
                                  {daysUntil < 0
                                    ? `${Math.abs(daysUntil)} days overdue`
                                    : `${daysUntil} days left`}
                                </span>
                              )}
                            </div>
                          </div>

                          <StatusBadge status={status} />
                        </div>

                        <div className="relative ml-4">
                          <button
                            onClick={() =>
                              setOpenMenuId(
                                openMenuId === doc.id ? null : doc.id!,
                              )
                            }
                            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <MoreVertical className="h-4 w-4 text-neutral-500" />
                          </button>

                          <AnimatePresence>
                            {openMenuId === doc.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-10"
                              >
                                <button
                                  onClick={() => handleView(doc)}
                                  className="w-full px-3 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </button>
                                {doc.file_path && (
                                  <button
                                    onClick={() => handleDownload(doc)}
                                    className="w-full px-3 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                                  >
                                    <Download className="h-4 w-4" />
                                    Download
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEdit(doc)}
                                  className="w-full px-3 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(doc)}
                                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
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
