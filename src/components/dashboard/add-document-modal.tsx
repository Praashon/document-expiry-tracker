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
  Hash,
  Building,
  Home,
  Shield,
  CreditCard,
  Car,
  ScrollText,
  Vote,
  Bookmark,
  FileCheck,
  Receipt,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DocumentType,
  DOCUMENT_TYPE_CONFIG,
  DOCUMENT_TYPES_BY_CATEGORY,
} from "@/lib/supabase";
import { processDocument, type ExtractedDocumentData } from "@/lib/ocr";

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = "select" | "automatic" | "manual";
type AutomaticStep = "upload" | "processing" | "review";

// Icon mapping for document types
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
  const [processingStatus, setProcessingStatus] = useState<string>("");

  // Form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("Other");
  const [expirationDate, setExpirationDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [documentNumber, setDocumentNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [metadata, setMetadata] = useState<{ key: string; value: string }[]>(
    [],
  );

  // OCR state
  const [ocrProcessed, setOcrProcessed] = useState(false);
  const [extractedData, setExtractedData] =
    useState<ExtractedDocumentData | null>(null);

  const resetForm = () => {
    setMode("select");
    setAutomaticStep("upload");
    setTitle("");
    setType("Other");
    setExpirationDate("");
    setReminderDate("");
    setNotes("");
    setFile(null);
    setDocumentNumber("");
    setIssueDate("");
    setIssuingAuthority("");
    setMetadata([]);
    setError(null);
    setProcessingStatus("");
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
    setProcessingStatus("Initializing...");

    try {
      setProcessingStatus("Loading language data...");

      const extracted = await processDocument(file, (progress) => {
        if (progress < 50) {
          setProcessingStatus("Analyzing document...");
        } else if (progress < 90) {
          setProcessingStatus("Extracting text...");
        } else {
          setProcessingStatus("Processing results...");
        }
      });

      setExtractedData(extracted);

      if (extracted.title) setTitle(extracted.title);
      if (extracted.type) setType(extracted.type as DocumentType);
      if (extracted.expiration_date)
        setExpirationDate(extracted.expiration_date);

      // Populate metadata from AI result
      // Populate metadata from AI result and auto-fill explicit fields
      if (extracted.metadata) {
        const metaEntries: { key: string; value: string }[] = [];

        for (const [keyRaw, valueRaw] of Object.entries(extracted.metadata)) {
          const keyLower = keyRaw.toLowerCase().replace(/_/g, " ");
          const value = String(valueRaw);

          if (keyLower.includes("document number") || keyLower === "number") {
            setDocumentNumber(value);
            continue;
          }
          if (keyLower.includes("issue date") || keyLower === "issued on") {
            setIssueDate(value);
            continue;
          }
          if (
            keyLower.includes("issuing authority") ||
            keyLower.includes("issued by") ||
            keyLower.includes("authority")
          ) {
            setIssuingAuthority(value);
            continue;
          }

          metaEntries.push({
            key: keyRaw
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase()), // Title Case
            value,
          });
        }
        setMetadata(metaEntries);
      }

      setOcrProcessed(true);
      setAutomaticStep("review");
    } catch (err) {
      console.error("OCR Error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to process document",
      );
      setAutomaticStep("upload");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    const config = DOCUMENT_TYPE_CONFIG[type];
    if (config.hasExpiry && !expirationDate) {
      setError("Expiration date is required for this document type");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("type", type);
      if (expirationDate) formData.append("expiration_date", expirationDate);
      if (reminderDate) formData.append("reminder_date", reminderDate);
      if (notes.trim()) formData.append("notes", notes.trim());
      if (documentNumber.trim())
        formData.append("document_number", documentNumber.trim());
      if (issueDate) formData.append("issue_date", issueDate);
      if (issuingAuthority.trim())
        formData.append("issuing_authority", issuingAuthority.trim());

      // Send metadata as JSON string
      if (metadata.length > 0) {
        const metadataObj = metadata.reduce(
          (acc, { key, value }) => {
            if (key.trim() && value.trim()) {
              acc[key.trim()] = value.trim();
            }
            return acc;
          },
          {} as Record<string, string>,
        );
        formData.append("metadata", JSON.stringify(metadataObj));
      }

      if (file) formData.append("file", file);

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create document");
      }

      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Submit error:", err);
      setError(err instanceof Error ? err.message : "Failed to save document");
    } finally {
      setIsLoading(false);
    }
  };

  const config = DOCUMENT_TYPE_CONFIG[type];
  const TypeIcon = TYPE_ICONS[type] || FileText;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                {mode !== "select" && (
                  <button
                    onClick={() => {
                      if (mode === "automatic" && automaticStep !== "upload") {
                        setAutomaticStep("upload");
                      } else {
                        setMode("select");
                        resetForm();
                      }
                    }}
                    className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 text-neutral-500" />
                  </button>
                )}
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {mode === "select" && "Add Document"}
                  {mode === "automatic" && "Scan Document"}
                  {mode === "manual" && "New Document"}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {/* Error Display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mode Selection */}
              {mode === "select" && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("automatic")}
                    className="group p-6 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-[#A8BBA3] dark:hover:border-[#A8BBA3] transition-all text-left"
                  >
                    <div className="p-3 rounded-xl bg-[#A8BBA3]/10 w-fit mb-3 group-hover:bg-[#A8BBA3]/20 transition-colors">
                      <Sparkles className="h-6 w-6 text-[#A8BBA3]" />
                    </div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                      Scan Document
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Auto-extract details with OCR
                    </p>
                  </button>

                  <button
                    onClick={() => setMode("manual")}
                    className="group p-6 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-[#A8BBA3] dark:hover:border-[#A8BBA3] transition-all text-left"
                  >
                    <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 w-fit mb-3 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                      <PenLine className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                      Manual Entry
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Fill in document details
                    </p>
                  </button>
                </div>
              )}

              {/* Automatic Mode - Upload */}
              {mode === "automatic" && automaticStep === "upload" && (
                <div className="space-y-4">
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive
                      ? "border-[#A8BBA3] bg-[#A8BBA3]/5"
                      : file
                        ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                        : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600"
                      }`}
                  >
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {file ? (
                      <div className="space-y-2">
                        <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {file.name}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-10 w-10 text-neutral-400 mx-auto" />
                        <p className="font-medium text-neutral-900 dark:text-white">
                          Drop your document here
                        </p>
                        <p className="text-sm text-neutral-500">
                          or click to browse
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={processWithOCR}
                    disabled={!file}
                    className="w-full bg-[#A8BBA3] hover:bg-[#96ab91] text-white h-11"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extract Details
                  </Button>
                </div>
              )}

              {/* Automatic Mode - Processing */}
              {mode === "automatic" && automaticStep === "processing" && (
                <div className="py-12 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <Loader2 className="h-16 w-16 text-[#A8BBA3] animate-spin" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      Processing Document
                    </p>
                    <p className="text-sm text-neutral-500 mt-1">
                      {processingStatus}
                    </p>
                  </div>
                </div>
              )}

              {/* Automatic Mode - Review / Manual Mode - Form */}
              {(mode === "manual" ||
                (mode === "automatic" && automaticStep === "review")) && (
                  <div className="space-y-5">
                    {/* Document Type Selection */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Document Type
                      </label>
                      <div className="space-y-2">
                        {/* Expiring Documents */}
                        <div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">
                            Expiring Documents
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {DOCUMENT_TYPES_BY_CATEGORY.expiring.map(
                              (docType) => {
                                const Icon = TYPE_ICONS[docType];
                                const isSelected = type === docType;
                                return (
                                  <button
                                    key={docType}
                                    type="button"
                                    onClick={() => setType(docType)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${isSelected
                                      ? "bg-[#A8BBA3] text-white"
                                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                      }`}
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                    {docType}
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </div>

                        {/* Identity Documents */}
                        <div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">
                            Identity Documents
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {DOCUMENT_TYPES_BY_CATEGORY.identity.map(
                              (docType) => {
                                const Icon = TYPE_ICONS[docType];
                                const isSelected = type === docType;
                                return (
                                  <button
                                    key={docType}
                                    type="button"
                                    onClick={() => setType(docType)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${isSelected
                                      ? "bg-[#A8BBA3] text-white"
                                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                      }`}
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                    {docType}
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </div>

                        {/* Other */}
                        <div className="flex flex-wrap gap-1.5">
                          {DOCUMENT_TYPES_BY_CATEGORY.other.map((docType) => {
                            const Icon = TYPE_ICONS[docType];
                            const isSelected = type === docType;
                            return (
                              <button
                                key={docType}
                                type="button"
                                onClick={() => setType(docType)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${isSelected
                                  ? "bg-[#A8BBA3] text-white"
                                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                  }`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {docType}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Title *
                      </label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={`e.g., My ${type}`}
                        className="h-10"
                      />
                    </div>

                    {/* Document Number (for identity docs) */}
                    {config.hasDocumentNumber && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                          <Hash className="h-3.5 w-3.5 inline mr-1" />
                          Document Number
                        </label>
                        <Input
                          value={documentNumber}
                          onChange={(e) => setDocumentNumber(e.target.value)}
                          placeholder="e.g., ABC123456"
                          className="h-10"
                        />
                      </div>
                    )}

                    {/* Dates Row */}
                    <div className="grid grid-cols-2 gap-3">
                      {config.hasDocumentNumber && (
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            <Calendar className="h-3.5 w-3.5 inline mr-1" />
                            Issue Date
                          </label>
                          <Input
                            type="date"
                            value={issueDate}
                            onChange={(e) => setIssueDate(e.target.value)}
                            className="h-10"
                          />
                        </div>
                      )}
                      <div
                        className={config.hasDocumentNumber ? "" : "col-span-2"}
                      >
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                          <Calendar className="h-3.5 w-3.5 inline mr-1" />
                          {config.hasExpiry
                            ? "Expiration Date *"
                            : "Expiration Date"}
                        </label>
                        <Input
                          type="date"
                          value={expirationDate}
                          onChange={(e) => setExpirationDate(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>

                    {/* Issuing Authority (for identity docs) */}
                    {config.hasDocumentNumber && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                          <Building className="h-3.5 w-3.5 inline mr-1" />
                          Issuing Authority
                        </label>
                        <Input
                          value={issuingAuthority}
                          onChange={(e) => setIssuingAuthority(e.target.value)}
                          placeholder="e.g., Government of Nepal"
                          className="h-10"
                        />
                      </div>
                    )}

                    {/* Reminder Date */}
                    {config.hasExpiry && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                          <Calendar className="h-3.5 w-3.5 inline mr-1" />
                          Reminder Date
                        </label>
                        <Input
                          type="date"
                          value={reminderDate}
                          onChange={(e) => setReminderDate(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional details..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#A8BBA3] resize-none text-sm"
                      />
                    </div>

                    {/* Dynamic Metadata Section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Additional Details
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setMetadata([...metadata, { key: "", value: "" }])
                          }
                          className="text-xs flex items-center gap-1 text-[#A8BBA3] hover:text-[#96ab91] font-medium transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add Field
                        </button>
                      </div>

                      <div className="space-y-2">
                        {metadata.map((item, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder="Label (e.g. Blood Group)"
                              value={item.key}
                              onChange={(e) => {
                                const newMeta = [...metadata];
                                newMeta[index].key = e.target.value;
                                setMetadata(newMeta);
                              }}
                              className="bg-neutral-50 dark:bg-neutral-800/50"
                            />
                            <Input
                              placeholder="Value"
                              value={item.value}
                              onChange={(e) => {
                                const newMeta = [...metadata];
                                newMeta[index].value = e.target.value;
                                setMetadata(newMeta);
                              }}
                              className="bg-neutral-50 dark:bg-neutral-800/50"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newMeta = metadata.filter(
                                  (_, i) => i !== index,
                                );
                                setMetadata(newMeta);
                              }}
                              className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {metadata.length === 0 && (
                          <p className="text-xs text-neutral-500 italic px-1">
                            No additional details. Click "Add Field" to add custom
                            data.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* File Upload (for manual mode or to change file) */}
                    {(mode === "manual" || !file) && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                          <Upload className="h-3.5 w-3.5 inline mr-1" />
                          Attachment
                        </label>
                        <div
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${dragActive
                            ? "border-[#A8BBA3] bg-[#A8BBA3]/5"
                            : file
                              ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                              : "border-neutral-300 dark:border-neutral-700"
                            }`}
                        >
                          <input
                            type="file"
                            onChange={handleFileChange}
                            accept="image/*,.pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          {file ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                {file.name}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFile(null);
                                }}
                                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                              >
                                <X className="h-3.5 w-3.5 text-neutral-500" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 text-neutral-500">
                              <Upload className="h-4 w-4" />
                              <span className="text-sm">
                                Drop file or click to upload
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show attached file info in review mode */}
                    {mode === "automatic" &&
                      automaticStep === "review" &&
                      file && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-neutral-700 dark:text-neutral-300">
                            {file.name}
                          </span>
                        </div>
                      )}
                  </div>
                )}
            </div>

            {/* Footer */}
            {(mode === "manual" ||
              (mode === "automatic" && automaticStep === "review")) && (
                <div className="flex justify-end gap-3 p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="bg-[#A8BBA3] hover:bg-[#96ab91] text-white min-w-[100px]"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save Document"
                    )}
                  </Button>
                </div>
              )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
