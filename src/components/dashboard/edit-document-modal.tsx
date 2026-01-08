"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Calendar, FileText, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DocumentType, Document } from "@/lib/supabase";

interface EditDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  document: Document | null;
}

const documentTypes: DocumentType[] = [
  "Rent Agreement",
  "Insurance",
  "Subscription",
  "License",
  "Warranty",
  "Contract",
  "Citizenship",
  "PAN Card",
  "National ID",
  "Passport",
  "Driving License",
  "Voter ID",
  "Birth Certificate",
  "Other",
];

export function EditDocumentModal({
  isOpen,
  onClose,
  onSuccess,
  document,
}: EditDocumentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("Other");
  const [expirationDate, setExpirationDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);

  useEffect(() => {
    if (document) {
      setTitle(document.title || "");
      setType(document.type || "Other");
      setExpirationDate(document.expiration_date || "");
      setReminderDate(document.reminder_date || "");
      setNotes(document.notes || "");
      setExistingFileName(document.file_name || null);
      setFile(null);
      setRemoveExistingFile(false);
      setError(null);
    }
  }, [document]);

  const resetForm = () => {
    setTitle("");
    setType("Other");
    setExpirationDate("");
    setReminderDate("");
    setNotes("");
    setFile(null);
    setExistingFileName(null);
    setRemoveExistingFile(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setRemoveExistingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setRemoveExistingFile(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (existingFileName) {
      setRemoveExistingFile(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!document?.id) {
      setError("No document to update");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a document title");
      return;
    }

    if (title.trim().length > 255) {
      setError("Title must be less than 255 characters");
      return;
    }

    if (!expirationDate) {
      setError("Please select an expiration date");
      return;
    }

    if (file && file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("type", type);
      formData.append("expiration_date", expirationDate);

      if (reminderDate) {
        formData.append("reminder_date", reminderDate);
      }

      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }

      if (file) {
        formData.append("file", file);
      }

      if (removeExistingFile) {
        formData.append("remove_file", "true");
      }

      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update document");
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#A8BBA3]/10 rounded-lg">
                    <FileText className="w-5 h-5 text-[#A8BBA3]" />
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Edit Document
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Document Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Car Insurance Policy"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isLoading}
                    maxLength={255}
                  />
                  <p className="text-xs text-neutral-400">
                    {title.length}/255 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {documentTypes.map((docType) => (
                      <button
                        key={docType}
                        type="button"
                        onClick={() => setType(docType)}
                        disabled={isLoading}
                        className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                          type === docType
                            ? "bg-[#A8BBA3] text-white border-[#A8BBA3]"
                            : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-[#A8BBA3]"
                        }`}
                      >
                        {docType}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Expiration Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        disabled={isLoading}
                        className="pl-10"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Reminder Date
                    </label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                        disabled={isLoading}
                        className="pl-10"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Notes
                  </label>
                  <textarea
                    placeholder="Add any additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                    className="flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8BBA3] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:ring-offset-neutral-950 dark:placeholder:text-neutral-400 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Attached File
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive
                        ? "border-[#A8BBA3] bg-[#A8BBA3]/5"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-[#A8BBA3]"
                    }`}
                  >
                    {file ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#A8BBA3]/10 rounded-lg">
                            <FileText className="w-5 h-5 text-[#A8BBA3]" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate max-w-[200px]">
                              {file.name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {formatFileSize(file.size)} (New file)
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                        >
                          <X className="w-4 h-4 text-neutral-500" />
                        </button>
                      </div>
                    ) : existingFileName && !removeExistingFile ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-500" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate max-w-[200px]">
                              {existingFileName}
                            </p>
                            <p className="text-xs text-neutral-500">
                              Current file
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Drag and drop a file here, or{" "}
                          <label className="text-[#A8BBA3] cursor-pointer hover:underline">
                            browse
                            <input
                              type="file"
                              onChange={handleFileChange}
                              disabled={isLoading}
                              className="hidden"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                            />
                          </label>
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          PDF, Word, Excel, Images up to 10MB
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
