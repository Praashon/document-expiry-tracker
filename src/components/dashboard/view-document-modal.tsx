"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Calendar,
  Clock,
  Tag,
  StickyNote,
  Download,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Document } from "@/lib/supabase";
import {
  getDocumentStatus,
  getDaysUntilExpiration,
  getFileDownloadUrl,
} from "@/lib/document-actions";
import { useState } from "react";

interface ViewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  document: Document | null;
}

function StatusBadge({ status }: { status: "valid" | "expiring_soon" | "expired" }) {
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${className}`}
    >
      <Icon className="h-4 w-4" />
      {text}
    </span>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function ViewDocumentModal({
  isOpen,
  onClose,
  onEdit,
  document,
}: ViewDocumentModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!document) return null;

  const status = document.expiration_date
    ? getDocumentStatus(document.expiration_date)
    : "valid";
  const daysUntil = document.expiration_date
    ? getDaysUntilExpiration(document.expiration_date)
    : null;

  const handleDownload = async () => {
    if (!document.file_path) return;

    setIsDownloading(true);
    try {
      const downloadUrl = await getFileDownloadUrl(document.file_path);
      window.open(downloadUrl, "_blank");
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Rent: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
      Insurance: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
      Subscription: "bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400",
      License: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
      Other: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
    };
    return colors[type] || colors.Other;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#A8BBA3]/10 rounded-lg">
                    <FileText className="w-5 h-5 text-[#A8BBA3]" />
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Document Details
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Title and Status */}
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {document.title}
                  </h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={status} />
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getTypeColor(document.type)}`}
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {document.type}
                    </span>
                  </div>
                </div>

                {/* Expiration Info */}
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white dark:bg-neutral-800 rounded-lg shadow-sm">
                      <Calendar className="w-4 h-4 text-neutral-500" />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Expiration Date
                      </p>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {document.expiration_date
                          ? formatDate(document.expiration_date)
                          : "Not set"}
                      </p>
                      {daysUntil !== null && (
                        <p
                          className={`text-sm mt-1 ${
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
                    </div>
                  </div>

                  {document.reminder_date && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white dark:bg-neutral-800 rounded-lg shadow-sm">
                        <Clock className="w-4 h-4 text-neutral-500" />
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Reminder Date
                        </p>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {formatDate(document.reminder_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {document.notes && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                      <StickyNote className="w-4 h-4" />
                      <span className="text-sm font-medium">Notes</span>
                    </div>
                    <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                      {document.notes}
                    </p>
                  </div>
                )}

                {/* Attached File */}
                {document.file_name && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-medium">Attached File</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#A8BBA3]/10 rounded-lg">
                          <FileText className="w-5 h-5 text-[#A8BBA3]" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white truncate max-w-[200px]">
                            {document.file_name}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {document.file_size
                              ? formatFileSize(document.file_size)
                              : "Unknown size"}
                            {document.file_type && ` • ${document.file_type}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="gap-2"
                      >
                        {isDownloading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Download
                      </Button>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>
                      Created:{" "}
                      {document.created_at
                        ? new Date(document.created_at).toLocaleDateString()
                        : "Unknown"}
                    </span>
                    <span>
                      Updated:{" "}
                      {document.updated_at
                        ? new Date(document.updated_at).toLocaleDateString()
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-6 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={onEdit}
                  className="flex-1 gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Edit Document
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
