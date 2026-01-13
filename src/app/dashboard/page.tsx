"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  Loader2,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Shield,
  FileText,
  Home,
  CreditCard,
  Car,
  ScrollText,
  Vote,
  Bookmark,
  FileCheck,
  Package,
  Hash,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { AddDocumentModal } from "@/components/dashboard/add-document-modal";
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
      text: "Expiring",
      className:
        "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
    },
    expired: {
      icon: AlertCircle,
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
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      <Icon className="h-3 w-3" />
      {text}
    </span>
  );
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "No expiry";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [refresh, setRefresh] = useState(false);
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "expiring" | "identity">(
    "all",
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );

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

  useEffect(() => {
    const handleAddDocument = () => {
      setIsAddModalOpen(true);
    };

    window.addEventListener("open-add-document", handleAddDocument);

    return () => {
      window.removeEventListener("open-add-document", handleAddDocument);
    };
  }, []);

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

  const stats = useMemo(() => {
    const total = documents.length;
    let expiringSoon = 0;
    let expired = 0;
    let identity = 0;

    documents.forEach((doc) => {
      const status = getDocumentStatus(doc.expiration_date);
      if (status === "expiring_soon") expiringSoon++;
      if (status === "expired") expired++;

      const config = DOCUMENT_TYPE_CONFIG[doc.type as DocumentType];
      if (config?.category === "identity") identity++;
    });

    return { total, expiringSoon, expired, identity };
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.title?.toLowerCase().includes(query) ||
          doc.document_number?.toLowerCase().includes(query) ||
          doc.type?.toLowerCase().includes(query),
      );
    }

    if (activeTab === "expiring") {
      result = result.filter((doc) => {
        const config = DOCUMENT_TYPE_CONFIG[doc.type as DocumentType];
        return config?.category === "expiring";
      });
    } else if (activeTab === "identity") {
      result = result.filter((doc) => {
        const config = DOCUMENT_TYPE_CONFIG[doc.type as DocumentType];
        return config?.category === "identity";
      });
    }

    result.sort((a, b) => {
      const statusA = getDocumentStatus(a.expiration_date);
      const statusB = getDocumentStatus(b.expiration_date);

      const priority: Record<string, number> = {
        expired: 0,
        expiring_soon: 1,
        valid: 2,
        no_expiry: 3,
      };

      if (priority[statusA] !== priority[statusB]) {
        return priority[statusA] - priority[statusB];
      }

      if (a.expiration_date && b.expiration_date) {
        return (
          new Date(a.expiration_date).getTime() -
          new Date(b.expiration_date).getTime()
        );
      }

      if (a.expiration_date && !b.expiration_date) return -1;
      if (!a.expiration_date && b.expiration_date) return 1;

      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    });

    return result;
  }, [documents, searchQuery, activeTab]);

  const handleView = (doc: Document) => {
    setSelectedDocument(doc);
    setIsViewModalOpen(true);
    setOpenMenuId(null);
  };

  const handleEdit = (doc: Document) => {
    setSelectedDocument(doc);
    setIsEditModalOpen(true);
    setOpenMenuId(null);
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
    if (!selectedDocument?.id) return;

    try {
      const response = await fetch(`/api/documents/${selectedDocument.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        handleRefresh();
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }

    setIsDeleteModalOpen(false);
    setSelectedDocument(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-[#A8BBA3]" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar />

      <div className="flex-1 md:ml-16">
        <Header user={user} sidebarCollapsed={true} />

        <main className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800"
            >
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats.total}
              </p>
              <p className="text-sm text-neutral-500">Document Library</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800"
            >
              <p className="text-2xl font-bold text-orange-600">
                {stats.expiringSoon}
              </p>
              <p className="text-sm text-neutral-500">Renewal Required</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800"
            >
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              <p className="text-sm text-neutral-500">Overdue</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800"
            >
              <p className="text-2xl font-bold text-blue-600">
                {stats.identity}
              </p>
              <p className="text-sm text-neutral-500">Identity Documents</p>
            </motion.div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search document library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#A8BBA3] focus:border-transparent transition-all"
              />
            </div>

            <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
              {(["all", "expiring", "identity"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab
                      ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  {tab === "all" && "All Documents"}
                  {tab === "expiring" && "Renewal Required"}
                  {tab === "identity" && "Identity Documents"}
                </button>
              ))}
            </div>

            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#A8BBA3] hover:bg-[#96ab91] text-white rounded-xl px-5"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </div>

          {filteredDocuments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                {searchQuery
                  ? "No matching documents found"
                  : "Document library is empty"}
              </h3>
              <p className="text-neutral-500 text-sm mb-4">
                {searchQuery
                  ? "Please refine your search criteria or browse all documents"
                  : "Begin by adding your first document to the system"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-[#A8BBA3] hover:bg-[#96ab91] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Document
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredDocuments.map((doc, index) => {
                  const status = getDocumentStatus(doc.expiration_date);
                  const daysUntil = getDaysUntilExpiration(doc.expiration_date);
                  const config = DOCUMENT_TYPE_CONFIG[doc.type as DocumentType];
                  const TypeIcon =
                    TYPE_ICONS[doc.type as DocumentType] || FileText;

                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ delay: index * 0.03 }}
                      className="group bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-[#A8BBA3]/50 transition-all"
                    >
                      <div className="flex items-center gap-4 p-4">
                        <div
                          className={`shrink-0 p-2.5 rounded-xl ${config?.bgColor || "bg-neutral-100 dark:bg-neutral-800"}`}
                        >
                          <TypeIcon
                            className={`h-5 w-5 ${config?.color || "text-neutral-600"}`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-medium text-neutral-900 dark:text-white truncate">
                              {doc.title}
                            </h3>
                            <StatusBadge status={status} />
                          </div>
                          <div className="flex items-center gap-3 text-sm text-neutral-500">
                            <span>{doc.type}</span>
                            {doc.document_number && (
                              <>
                                <span className="text-neutral-300 dark:text-neutral-700">
                                  •
                                </span>
                                <span className="flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  {doc.document_number}
                                </span>
                              </>
                            )}
                            <span className="text-neutral-300 dark:text-neutral-700">
                              •
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(doc.expiration_date)}
                            </span>
                          </div>
                        </div>

                        {daysUntil !== null && (
                          <div className="hidden sm:block text-right shrink-0">
                            <p
                              className={`text-sm font-medium ${
                                daysUntil < 0
                                  ? "text-red-600"
                                  : daysUntil <= 30
                                    ? "text-orange-600"
                                    : "text-neutral-500"
                              }`}
                            >
                              {daysUntil < 0
                                ? `${Math.abs(daysUntil)}d overdue`
                                : `${daysUntil}d left`}
                            </p>
                          </div>
                        )}

                        <div className="relative shrink-0">
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

      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleRefresh}
      />

      {selectedDocument && (
        <>
          <ViewDocumentModal
            isOpen={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedDocument(null);
            }}
            document={selectedDocument}
          />

          <EditDocumentModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedDocument(null);
            }}
            onSuccess={handleRefresh}
            document={selectedDocument}
          />

          <DeleteConfirmModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedDocument(null);
            }}
            onConfirm={handleDeleteConfirm}
            documentTitle={selectedDocument.title}
          />
        </>
      )}

      {openMenuId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenMenuId(null)}
        />
      )}

      {/* Floating AI Chat */}
      <AIChat />
    </div>
  );
}
