"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AddDocumentModal } from "@/components/dashboard/add-document-modal";
import { EditDocumentModal } from "@/components/dashboard/edit-document-modal";
import { DeleteConfirmModal } from "@/components/dashboard/delete-confirm-modal";
import { ViewDocumentModal } from "@/components/dashboard/view-document-modal";
import { checkAuth } from "@/lib/auth-actions";
import { AIChat } from "@/components/chat/ai-chat";
import {
  getDocuments,
  getDocumentStatus,
  getFileDownloadUrl,
  type Document,
  type DocumentType,
} from "@/lib/document-actions";
import { DOCUMENT_TYPE_CONFIG } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/toast";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { DocumentGrid } from "@/components/dashboard/document-grid";

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
  };

  const handleEdit = (doc: Document) => {
    setSelectedDocument(doc);
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
    if (!selectedDocument?.id) return;

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
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />

      <div className="flex-1 md:ml-16">
        <Header user={user} sidebarCollapsed={true} />

        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-10">
            <StatsGrid refresh={refresh} />
          </div>

          <DashboardToolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onAddDocument={() => setIsAddModalOpen(true)}
          />

          <DocumentGrid
            documents={filteredDocuments}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onDownload={handleDownload}
          />
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

      {/* Floating AI Chat */}
      <AIChat />
    </div>
  );
}
