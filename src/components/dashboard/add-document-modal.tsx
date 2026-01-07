"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  Calendar,
  FileText,
  Loader2,
  Sparkles,
  PenLine,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DocumentType } from "@/lib/supabase";

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = "select" | "automatic" | "manual";
type AutomaticStep = "upload" | "processing" | "review";

const documentTypes: DocumentType[] = [
  "Rent",
  "Insurance",
  "Subscription",
  "License",
  "Other",
];

export function AddDocumentModal({
  isOpen,
  onClose,
  onSuccess,
}: AddDocumentModalProps) {
  const [mode, setMode] = useState<Mode>("select");
  const [automaticStep, setAutomaticStep] = useState<AutomaticStep>("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("Other");
  const [expirationDate, setExpirationDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [ocrProcessed, setOcrProcessed] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    title: string | null;
    type: DocumentType;
    expiration_date: string | null;
    raw_text: string;
    dates_found: string[];
  } | null>(null);

  const resetForm = () => {
    setMode("select");
    setAutomaticStep("upload");
    setTitle("");
    setType("Other");
    setExpirationDate("");
    setReminderDate("");
    setNotes("");
    setFile(null);
    setError(null);
    setOcrProcessed(false);
    setExtractedData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const processWithOCR = async () => {
    if (!file) {
      setError("Please upload a file first");
      return;
    }

    setAutomaticStep("processing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process document");
      }

      setExtractedData(data.extracted);

      if (data.extracted.title) {
        setTitle(data.extracted.title);
      }
      if (data.extracted.type) {
        setType(data.extracted.type);
      }
      if (data.extracted.expiration_date) {
        setExpirationDate(data.extracted.expiration_date);
      }

      setOcrProcessed(true);
      setAutomaticStep("review");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error processing document",
      );
      setAutomaticStep("upload");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a document title");
      return;
    }

    if (!expirationDate) {
      setError("Please select an expiration date");
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

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create document");
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

  const goBack = () => {
    if (mode === "automatic" && automaticStep === "review") {
      setAutomaticStep("upload");
      setOcrProcessed(false);
    } else {
      setMode("select");
      setFile(null);
      setOcrProcessed(false);
      setExtractedData(null);
    }
    setError(null);
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
                  {mode !== "select" && (
                    <button
                      onClick={goBack}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors mr-1"
                    >
                      <ArrowLeft className="w-4 h-4 text-neutral-500" />
                    </button>
                  )}
                  <div className="p-2 bg-[#A8BBA3]/10 rounded-lg">
                    <FileText className="w-5 h-5 text-[#A8BBA3]" />
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    {mode === "select"
                      ? "Add New Document"
                      : mode === "automatic"
                        ? automaticStep === "upload"
                          ? "Upload Document"
                          : automaticStep === "processing"
                            ? "Processing..."
                            : "Review & Edit"
                        : "Manual Entry"}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <div className="p-6">
                {mode === "select" && (
                  <div className="space-y-4">
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                      Choose how you want to add your document:
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => setMode("automatic")}
                        className="group relative p-5 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-[#A8BBA3] dark:hover:border-[#A8BBA3] transition-all text-left"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-gradient-to-br from-[#A8BBA3]/20 to-emerald-500/20 rounded-xl group-hover:scale-110 transition-transform">
                            <Wand2 className="w-6 h-6 text-[#A8BBA3]" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-neutral-900 dark:text-white">
                                Automatic
                              </h3>
                              <span className="px-2 py-0.5 bg-[#A8BBA3]/10 text-[#A8BBA3] text-xs font-medium rounded-full">
                                Smart
                              </span>
                            </div>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                              Upload your document and we&apos;ll extract the
                              title, type, and expiration date automatically
                              using OCR.
                            </p>
                          </div>
                        </div>
                        <Sparkles className="absolute top-3 right-3 w-4 h-4 text-[#A8BBA3]/40" />
                      </button>

                      <button
                        onClick={() => setMode("manual")}
                        className="group p-5 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-[#A8BBA3] dark:hover:border-[#A8BBA3] transition-all text-left"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl group-hover:scale-110 transition-transform">
                            <PenLine className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-neutral-900 dark:text-white">
                              Manual Entry
                            </h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                              Fill in the document details yourself. You can
                              optionally attach a file.
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {mode === "automatic" && automaticStep === "upload" && (
                  <div className="space-y-4">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                      </motion.div>
                    )}

                    <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                      Upload a clear image or PDF of your document. We&apos;ll
                      use OCR to extract the information.
                    </p>

                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                        dragActive
                          ? "border-[#A8BBA3] bg-[#A8BBA3]/5"
                          : file
                            ? "border-[#A8BBA3] bg-[#A8BBA3]/5"
                            : "border-neutral-200 dark:border-neutral-700 hover:border-[#A8BBA3]"
                      }`}
                    >
                      {file ? (
                        <div className="space-y-3">
                          <div className="w-12 h-12 bg-[#A8BBA3]/10 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-6 h-6 text-[#A8BBA3]" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {file.name}
                            </p>
                            <p className="text-sm text-neutral-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <button
                            onClick={() => setFile(null)}
                            className="text-sm text-red-500 hover:text-red-600"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                          <p className="text-neutral-600 dark:text-neutral-400">
                            Drag and drop your document here, or{" "}
                            <label className="text-[#A8BBA3] cursor-pointer hover:underline font-medium">
                              browse
                              <input
                                type="file"
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*,application/pdf"
                              />
                            </label>
                          </p>
                          <p className="text-xs text-neutral-400 mt-2">
                            Supports: JPEG, PNG, WebP, PDF (max 10MB)
                          </p>
                        </>
                      )}
                    </div>

                    <Button
                      onClick={processWithOCR}
                      disabled={!file}
                      className="w-full"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Extract Information
                    </Button>
                  </div>
                )}

                {mode === "automatic" && automaticStep === "processing" && (
                  <div className="py-12 text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 border-4 border-[#A8BBA3]/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-[#A8BBA3] rounded-full border-t-transparent animate-spin" />
                      <Wand2 className="absolute inset-0 m-auto w-6 h-6 text-[#A8BBA3]" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        Analyzing your document...
                      </p>
                      <p className="text-sm text-neutral-500 mt-1">
                        Extracting text and identifying key information
                      </p>
                    </div>
                  </div>
                )}

                {((mode === "automatic" && automaticStep === "review") ||
                  mode === "manual") && (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                      </motion.div>
                    )}

                    {ocrProcessed && extractedData && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>
                          Document analyzed! Review and edit the extracted
                          information below.
                        </span>
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
                      />
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
                          Expiration Date{" "}
                          <span className="text-red-500">*</span>
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

                    {mode === "manual" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Attach File (Optional)
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
                                    {formatFileSize(file.size)}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setFile(null)}
                                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                              >
                                <X className="w-4 h-4 text-neutral-500" />
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
                    )}

                    {mode === "automatic" && file && (
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg flex items-center gap-3">
                        <div className="p-2 bg-[#A8BBA3]/10 rounded-lg">
                          <FileText className="w-4 h-4 text-[#A8BBA3]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {formatFileSize(file.size)} • Will be attached
                          </p>
                        </div>
                      </div>
                    )}

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
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Add Document"
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
