"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  FileIcon,
  Clock,
  AlertCircle,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  getDocuments,
  getDocumentStatus,
  getDaysUntilExpiration,
  deleteDocument,
  DocumentStatus,
  Document,
} from "@/lib/document-actions";
import { checkAuth } from "@/lib/auth-actions";

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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RecentDocs({ refresh }: { refresh: boolean }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const currentUser = await checkAuth();
      if (currentUser) {
        const userDocuments = await getDocuments(currentUser.id);
        setDocuments(userDocuments as Document[]);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [refresh]);

  const handleDelete = async (docId: string, filePath?: string | null) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    setDeletingId(docId);
    try {
      await deleteDocument(docId, filePath || undefined);
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // Show only the 5 most recent documents
  const recentDocuments = documents.slice(0, 5);

  return (
    <Card className="col-span-4 border-none shadow-sm dark:bg-neutral-900/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Documents</CardTitle>
          <CardDescription>
            Your recently added documents and their status.
          </CardDescription>
        </div>
        {documents.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-[#A8BBA3] hover:text-[#92a88d] dark:text-[#A8BBA3]"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A8BBA3]"></div>
              <p className="mt-3 text-neutral-500 dark:text-neutral-400">
                Loading documents...
              </p>
            </div>
          ) : recentDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-neutral-500 dark:text-neutral-400">
              <FileIcon className="h-12 w-12 mb-3 opacity-20" />
              <p>No documents found.</p>
              <p className="text-sm mt-1">
                Add your first document to start tracking!
              </p>
            </div>
          ) : (
            recentDocuments.map((doc, i) => {
              const status = doc.expiration_date
                ? getDocumentStatus(doc.expiration_date)
                : "valid";
              const daysUntil = doc.expiration_date
                ? getDaysUntilExpiration(doc.expiration_date)
                : null;

              return (
                <motion.div
                  key={doc.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-white dark:bg-neutral-900 flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm shrink-0">
                      <FileIcon className="h-5 w-5 text-neutral-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-[#A8BBA3] transition-colors truncate">
                        {doc.title || doc.file_name || "Untitled Document"}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                        <span className="capitalize">
                          {doc.type || "Other"}
                        </span>
                        {doc.expiration_date && (
                          <>
                            <span>•</span>
                            <span>
                              {daysUntil !== null && daysUntil < 0
                                ? `Expired ${Math.abs(daysUntil)} days ago`
                                : daysUntil === 0
                                  ? "Expires today"
                                  : `Expires in ${daysUntil} days`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <StatusBadge status={status} />
                    {doc.expiration_date && (
                      <span className="text-xs text-neutral-400 hidden sm:inline">
                        {formatDate(doc.expiration_date)}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-neutral-400 hover:text-red-500 dark:hover:text-red-400"
                      onClick={() => handleDelete(doc.id!, doc.file_path)}
                      disabled={deletingId === doc.id}
                    >
                      {deletingId === doc.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
