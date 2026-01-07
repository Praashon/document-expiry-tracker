"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { AddDocumentModal } from "@/components/dashboard/add-document-modal";
import { EditDocumentModal } from "@/components/dashboard/edit-document-modal";
import { DeleteConfirmModal } from "@/components/dashboard/delete-confirm-modal";
import { ViewDocumentModal } from "@/components/dashboard/view-document-modal";
import { checkAuth } from "@/lib/auth-actions";
import {
  getDocuments,
  getDocumentStatus,
  getDaysUntilExpiration,
  type Document,
  type DocumentStatus,
  type DocumentType,
} from "@/lib/document-actions";
import type { User } from "@supabase/supabase-js";

type SortField = "title" | "expiration_date" | "created_at" | "type";
type SortOrder = "asc" | "desc";

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
      icon: AlertCircle,
      text: "Expired",
      className: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    },
  };

  const { icon: Icon, text, className } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}
    >
      <Icon className="h-3 w-3" />
      {text}
    </span>
  );
}

function TypeBadge({ type }: { type: DocumentType }) {
  const colors: Record<string, string> = {
    Rent: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    Insurance:
      "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    Subscription:
      "bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400",
    License:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    Other:
      "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[type] || colors.Other}`}
    >
      {type}
    </span>
  );
}

function formatDate(dateString: string): string {
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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [refresh, setRefresh] = useState(false);
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showFilters, setShowFilters] = useState(false);

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

  const filteredAndSortedDocuments = useMemo(() => {
    let result = [...documents];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.title?.toLowerCase().includes(query) ||
          doc.notes?.toLowerCase().includes(query) ||
          doc.type?.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((doc) => {
        if (!doc.expiration_date) return false;
        return getDocumentStatus(doc.expiration_date) === statusFilter;
      });
    }

    if (typeFilter !== "all") {
      result = result.filter((doc) => doc.type === typeFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "title":
          comparison = (a.title || "").localeCompare(b.title || "");
          break;
        case "expiration_date":
          const dateA = a.expiration_date
            ? new Date(a.expiration_date).getTime()
            : 0;
          const dateB = b.expiration_date
            ? new Date(b.expiration_date).getTime()
            : 0;
          comparison = dateA - dateB;
          break;
        case "created_at":
          const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
          comparison = createdA - createdB;
          break;
        case "type":
          comparison = (a.type || "").localeCompare(b.type || "");
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [documents, searchQuery, statusFilter, typeFilter, sortField, sortOrder]);

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

  const handleDeleteClick = (doc: Document) => {
    setSelectedDocument(doc);
    setIsDeleteModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDocument?.id) return;

    const response = await fetch(`/api/documents/${selectedDocument.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to delete document");
    }

    handleRefresh();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSortField("created_at");
    setSortOrder("desc");
  };

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    sortField !== "created_at" ||
    sortOrder !== "desc";

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
            className="mx-auto max-w-7xl space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  Dashboard
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                  Welcome back! Manage and track all your documents.
                </p>
              </div>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 shadow-lg shadow-[#A8BBA3]/20"
              >
                <Plus className="w-4 h-4" />
                Add Document
              </Button>
            </div>

            <StatsGrid refresh={refresh} />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  All Documents
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    {filteredAndSortedDocuments.length}
                  </span>{" "}
                  {filteredAndSortedDocuments.length === 1
                    ? "document"
                    : "documents"}
                  {documents.length !== filteredAndSortedDocuments.length && (
                    <span className="text-neutral-400 dark:text-neutral-500">
                      {" "}
                      of {documents.length}
                    </span>
                  )}
                </p>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-2 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="pl-3">
                    <Search className="w-5 h-5 text-[#A8BBA3]" />
                  </div>

                  <input
                    type="text"
                    placeholder="Search your documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 text-base py-2"
                  />

                  {searchQuery && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => setSearchQuery("")}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                    >
                      <X className="w-4 h-4 text-neutral-400" />
                    </motion.button>
                  )}

                  <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                      showFilters
                        ? "bg-[#A8BBA3] text-white"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">
                      Filters
                    </span>
                    {hasActiveFilters && !showFilters && (
                      <span className="w-2 h-2 bg-[#A8BBA3] rounded-full animate-pulse" />
                    )}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mr-2">
                        Status
                      </span>
                      {[
                        { value: "all", label: "All", icon: Sparkles },
                        { value: "valid", label: "Valid", icon: CheckCircle },
                        {
                          value: "expiring_soon",
                          label: "Expiring",
                          icon: Clock,
                        },
                        {
                          value: "expired",
                          label: "Expired",
                          icon: AlertCircle,
                        },
                      ].map((status) => (
                        <button
                          key={status.value}
                          onClick={() =>
                            setStatusFilter(
                              status.value as DocumentStatus | "all",
                            )
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            statusFilter === status.value
                              ? status.value === "valid"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-2 ring-green-500/20"
                                : status.value === "expiring_soon"
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 ring-2 ring-orange-500/20"
                                  : status.value === "expired"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-2 ring-red-500/20"
                                    : "bg-[#A8BBA3]/20 text-[#A8BBA3] dark:bg-[#A8BBA3]/20 ring-2 ring-[#A8BBA3]/30"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          }`}
                        >
                          <status.icon className="w-3.5 h-3.5" />
                          {status.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mr-2">
                        Type
                      </span>
                      {[
                        { value: "all", label: "All Types" },
                        { value: "Rent", label: "Rent" },
                        { value: "Insurance", label: "Insurance" },
                        { value: "Subscription", label: "Subscription" },
                        { value: "License", label: "License" },
                        { value: "Other", label: "Other" },
                      ].map((type) => (
                        <button
                          key={type.value}
                          onClick={() =>
                            setTypeFilter(type.value as DocumentType | "all")
                          }
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            typeFilter === type.value
                              ? type.value === "Rent"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 ring-2 ring-purple-500/20"
                                : type.value === "Insurance"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-2 ring-blue-500/20"
                                  : type.value === "Subscription"
                                    ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 ring-2 ring-pink-500/20"
                                    : type.value === "License"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-2 ring-amber-500/20"
                                      : "bg-[#A8BBA3]/20 text-[#A8BBA3] dark:bg-[#A8BBA3]/20 ring-2 ring-[#A8BBA3]/30"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-neutral-400" />
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Sort
                        </span>
                      </div>
                      <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
                        {[
                          { value: "created_at", label: "Newest" },
                          { value: "expiration_date", label: "Expiring" },
                          { value: "title", label: "A-Z" },
                        ].map((sort) => (
                          <button
                            key={sort.value}
                            onClick={() => {
                              if (sortField === sort.value) {
                                setSortOrder(
                                  sortOrder === "asc" ? "desc" : "asc",
                                );
                              } else {
                                setSortField(sort.value as SortField);
                                setSortOrder(
                                  sort.value === "title" ? "asc" : "desc",
                                );
                              }
                            }}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                              sortField === sort.value
                                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                            }`}
                          >
                            {sort.label}
                            {sortField === sort.value && (
                              <span className="ml-1 text-xs">
                                {sortOrder === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      {hasActiveFilters && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={clearFilters}
                          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neutral-500 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Clear all
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {filteredAndSortedDocuments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-12 text-center"
              >
                <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-neutral-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                  {documents.length === 0
                    ? "No documents yet"
                    : "No matching documents"}
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
                  {documents.length === 0
                    ? "Add your first document to start tracking expirations and never miss a deadline."
                    : "Try adjusting your search or filters to find what you're looking for."}
                </p>
                {documents.length === 0 ? (
                  <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Document
                  </Button>
                ) : (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedDocuments.map((doc, index) => {
                  const status = doc.expiration_date
                    ? getDocumentStatus(doc.expiration_date)
                    : "valid";
                  const daysUntil = doc.expiration_date
                    ? getDaysUntilExpiration(doc.expiration_date)
                    : null;

                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:shadow-lg hover:border-[#A8BBA3]/50 transition-all group"
                    >
                      <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-[#A8BBA3]/10 rounded-lg shrink-0 group-hover:bg-[#A8BBA3]/20 transition-colors">
                              <FileText className="w-5 h-5 text-[#A8BBA3]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-neutral-900 dark:text-white truncate group-hover:text-[#A8BBA3] transition-colors">
                                {doc.title || "Untitled Document"}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <TypeBadge type={doc.type} />
                              </div>
                            </div>
                          </div>

                          <div className="relative">
                            <button
                              onClick={() =>
                                setOpenMenuId(
                                  openMenuId === doc.id ? null : doc.id!,
                                )
                              }
                              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-neutral-400" />
                            </button>

                            <AnimatePresence>
                              {openMenuId === doc.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-10"
                                >
                                  <button
                                    onClick={() => handleView(doc)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleEdit(doc)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(doc)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      <div
                        className="p-4 space-y-3 cursor-pointer"
                        onClick={() => handleView(doc)}
                      >
                        <div className="flex items-center justify-between">
                          <StatusBadge status={status} />
                          {doc.file_name && (
                            <span className="text-xs text-neutral-400 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Attached
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-neutral-400" />
                          <span className="text-neutral-600 dark:text-neutral-400">
                            {doc.expiration_date
                              ? formatDate(doc.expiration_date)
                              : "No expiration"}
                          </span>
                        </div>

                        {daysUntil !== null && (
                          <p
                            className={`text-sm font-medium ${
                              daysUntil < 0
                                ? "text-red-500"
                                : daysUntil <= 30
                                  ? "text-orange-500"
                                  : "text-green-500"
                            }`}
                          >
                            {daysUntil < 0
                              ? `Expired ${Math.abs(daysUntil)} days ago`
                              : daysUntil === 0
                                ? "Expires today"
                                : `Expires in ${daysUntil} days`}
                          </p>
                        )}

                        {doc.notes && (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
                            {doc.notes}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </main>
      </div>

      {/* Click outside to close menu */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenMenuId(null)}
        />
      )}

      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleRefresh}
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
        documentTitle={selectedDocument?.title || "this document"}
      />

      <ViewDocumentModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedDocument(null);
        }}
        onEdit={() => {
          setIsViewModalOpen(false);
          setIsEditModalOpen(true);
        }}
        document={selectedDocument}
      />
    </div>
  );
}
