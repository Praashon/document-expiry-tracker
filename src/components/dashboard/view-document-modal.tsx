"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Calendar,
  Clock,
  Download,
  CheckCircle,
  AlertCircle,
  Shield,
  Hash,
  Building,
  Home,
  CreditCard,
  Car,
  ScrollText,
  Vote,
  Bookmark,
  FileCheck,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Document, DocumentType, DocumentStatus } from "@/lib/supabase";
import { DOCUMENT_TYPE_CONFIG } from "@/lib/supabase";
import {
  getDocumentStatus,
  getDaysUntilExpiration,
  getFileDownloadUrl,
} from "@/lib/document-actions";

interface ViewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
}

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

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function ViewDocumentModal({
  isOpen,
  onClose,
  document,
}: ViewDocumentModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !document) return null;

  const status = getDocumentStatus(document.expiration_date);
  const daysUntil = getDaysUntilExpiration(document.expiration_date);
  const config = DOCUMENT_TYPE_CONFIG[document.type as DocumentType];
  const TypeIcon = TYPE_ICONS[document.type as DocumentType] || FileText;

  const handleDownload = async () => {
    if (!document.file_path) return;

    setIsDownloading(true);
    try {
      const downloadUrl = await getFileDownloadUrl(document.file_path);
      window.open(downloadUrl, "_blank");
    } catch (error) {
      console.error("Error downloading file:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div
              className={`p-5 ${config?.bgColor || "bg-neutral-100 dark:bg-neutral-800"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/60 dark:bg-neutral-800/60">
                    <TypeIcon
                      className={`h-6 w-6 ${config?.color || "text-neutral-600"}`}
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {document.title}
                    </h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {document.type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <X className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                </button>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <StatusBadge status={status} />
                {daysUntil !== null && (
                  <span
                    className={`text-sm font-medium ${
                      daysUntil < 0
                        ? "text-red-600 dark:text-red-400"
                        : daysUntil <= 30
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {daysUntil < 0
                      ? `${Math.abs(daysUntil)} days overdue`
                      : `${daysUntil} days left`}
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Document Number */}
              {document.document_number && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <Hash className="h-4 w-4 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Document Number</p>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {document.document_number}
                    </p>
                  </div>
                </div>
              )}

              {/* Issue Date */}
              {document.issue_date && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <Calendar className="h-4 w-4 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Issue Date</p>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {formatDate(document.issue_date)}
                    </p>
                  </div>
                </div>
              )}

              {/* Expiration Date */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <Calendar className="h-4 w-4 text-neutral-500" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Expiration Date</p>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {document.expiration_date
                      ? formatDate(document.expiration_date)
                      : "No expiration"}
                  </p>
                </div>
              </div>

              {/* Issuing Authority */}
              {document.issuing_authority && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <Building className="h-4 w-4 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">
                      Issuing Authority
                    </p>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {document.issuing_authority}
                    </p>
                  </div>
                </div>
              )}

              {/* Reminder Date */}
              {document.reminder_date && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <Clock className="h-4 w-4 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Reminder Date</p>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {formatDate(document.reminder_date)}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {document.notes && (
                <div className="pt-2">
                  <p className="text-xs text-neutral-500 mb-1">Notes</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                    {document.notes}
                  </p>
                </div>
              )}

              {/* Attached File */}
              {document.file_name && (
                <div className="pt-2">
                  <p className="text-xs text-neutral-500 mb-2">Attachment</p>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-[#A8BBA3] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                          {document.file_name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatFileSize(document.file_size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="shrink-0"
                    >
                      {isDownloading ? (
                        <span className="h-4 w-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
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

            {/* Footer */}
            <div className="p-5 pt-0">
              <Button variant="outline" onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
