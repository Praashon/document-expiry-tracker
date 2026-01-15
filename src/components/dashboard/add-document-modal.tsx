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
  AlertTriangle,
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
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DocumentType,
  DOCUMENT_TYPE_CONFIG,
  DOCUMENT_TYPES_BY_CATEGORY,
} from "@/lib/supabase";
import {
  processDocument,
  processMultipleDocuments,
  type ExtractedDocumentData,
} from "@/lib/ocr";
import {
  analyzeDocumentWithPuter,
  analyzeMultipleDocumentsWithPuter,
  loadPuterJS,
  isPuterAuthenticated,
  PuterAuthError,
} from "@/lib/puter-ai";

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = "select" | "automatic" | "manual";
type AutomaticStep = "upload" | "processing" | "review";

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
    []
  );

  type CardSide = "front" | "back" | "both";
  const [cardSide, setCardSide] = useState<CardSide>("front");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [activeDragZone, setActiveDragZone] = useState<"front" | "back" | null>(
    null
  );

  const [ocrProcessed, setOcrProcessed] = useState(false);
  const [extractedData, setExtractedData] =
    useState<ExtractedDocumentData | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [usedFallback, setUsedFallback] = useState(false);

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

    setCardSide("front");
    setFrontFile(null);
    setBackFile(null);
    setOcrConfidence(0);
    setActiveDragZone(null);
    setUsedFallback(false);
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

  const handleFrontBackFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    side: "front" | "back"
  ) => {
    if (e.target.files && e.target.files[0]) {
      if (side === "front") {
        setFrontFile(e.target.files[0]);
      } else {
        setBackFile(e.target.files[0]);
      }
      setError(null);
    }
  };

  const processWithOCR = async () => {
    // Validate files based on card side mode
    if (cardSide === "front" || cardSide === "back") {
      const targetFile =
        cardSide === "front" ? frontFile || file : backFile || file;
      if (!targetFile) {
        setError("Please upload a file first");
        return;
      }
    } else if (cardSide === "both") {
      if (!frontFile && !backFile) {
        setError("Please upload at least one side of the document");
        return;
      }
    } else if (!file) {
      setError("Please upload a file first");
      return;
    }

    setAutomaticStep("processing");
    setError(null);
    setUsedFallback(false);

    const processWithPuter = async () => {
      setProcessingStatus("Loading Puter.js AI...");
      await loadPuterJS();

      // Check if user is authenticated
      const isAuth = await isPuterAuthenticated();
      if (!isAuth) {
        throw new PuterAuthError("Please sign in to Puter.js for best results");
      }

      setProcessingStatus("Analyzing document with GPT-4o...");

      if (cardSide === "both" && (frontFile || backFile)) {
        return await analyzeMultipleDocumentsWithPuter({
          front: frontFile || undefined,
          back: backFile || undefined,
        });
      } else {
        const targetFile =
          cardSide === "front"
            ? frontFile || file
            : cardSide === "back"
            ? backFile || file
            : file;
        return await analyzeDocumentWithPuter(targetFile!);
      }
    };

    const processWithTesseract = async () => {
      setProcessingStatus("Loading OCR engine...");
      let extracted: ExtractedDocumentData;

      if (cardSide === "both" && (frontFile || backFile)) {
        extracted = await processMultipleDocuments(
          { front: frontFile || undefined, back: backFile || undefined },
          (progress) => {
            if (progress < 30) {
              setProcessingStatus("Processing front side...");
            } else if (progress < 60) {
              setProcessingStatus("Processing back side...");
            } else if (progress < 90) {
              setProcessingStatus("Extracting text...");
            } else {
              setProcessingStatus("Analyzing with AI...");
            }
          }
        );
      } else {
        const targetFile =
          cardSide === "front"
            ? frontFile || file
            : cardSide === "back"
            ? backFile || file
            : file;
        extracted = await processDocument(targetFile!, (progress) => {
          if (progress < 50) {
            setProcessingStatus("Analyzing document...");
          } else if (progress < 90) {
            setProcessingStatus("Extracting text...");
          } else {
            setProcessingStatus("Processing with AI...");
          }
        });
      }
      return extracted;
    };

    try {
      let puterResult = null;
      let tesseractResult: ExtractedDocumentData | null = null;

      // Try Puter.js first (best quality)
      try {
        puterResult = await processWithPuter();
      } catch (puterErr) {
        console.log(
          "Puter.js not available, falling back to Tesseract:",
          puterErr
        );
        setUsedFallback(true);
        // Fall back to Tesseract + OpenRouter
        tesseractResult = await processWithTesseract();
      }

      if (puterResult) {
        // Process Puter result
        setOcrConfidence(95);

        if (puterResult.title) setTitle(puterResult.title);
        if (puterResult.type) setType(puterResult.type as DocumentType);
        if (puterResult.expiration_date)
          setExpirationDate(puterResult.expiration_date);
        if (puterResult.issue_date) setIssueDate(puterResult.issue_date);
        if (puterResult.document_number)
          setDocumentNumber(puterResult.document_number);
        if (puterResult.issuing_authority)
          setIssuingAuthority(puterResult.issuing_authority);

        const metaEntries: { key: string; value: string }[] = [];
        if (puterResult.name) {
          metaEntries.push({ key: "Name", value: puterResult.name });
        }
        if (puterResult.metadata) {
          for (const [keyRaw, valueRaw] of Object.entries(
            puterResult.metadata
          )) {
            const value = String(valueRaw);
            if (value && value !== "null" && value !== "undefined") {
              metaEntries.push({
                key: keyRaw
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase()),
                value,
              });
            }
          }
        }
        setMetadata(metaEntries);

        const extractedData: ExtractedDocumentData = {
          title: puterResult.title,
          type: puterResult.type,
          expiration_date: puterResult.expiration_date,
          issue_date: puterResult.issue_date,
          name: puterResult.name,
          raw_text: puterResult.raw_response,
          dates_found: [],
          confidence: 95,
          metadata: puterResult.metadata,
        };
        setExtractedData(extractedData);
      } else if (tesseractResult) {
        // Process Tesseract result
        setOcrConfidence(tesseractResult.confidence || 0);
        setExtractedData(tesseractResult);

        if (tesseractResult.title) setTitle(tesseractResult.title);
        if (tesseractResult.type) setType(tesseractResult.type as DocumentType);
        if (tesseractResult.expiration_date)
          setExpirationDate(tesseractResult.expiration_date);
        if (tesseractResult.issue_date)
          setIssueDate(tesseractResult.issue_date);

        const metaEntries: { key: string; value: string }[] = [];
        if (tesseractResult.name) {
          metaEntries.push({ key: "Name", value: tesseractResult.name });
        }
        if (tesseractResult.metadata) {
          for (const [keyRaw, valueRaw] of Object.entries(
            tesseractResult.metadata
          )) {
            const keyLower = keyRaw.toLowerCase().replace(/_/g, " ");
            const value = String(valueRaw);

            if (!value || value === "null" || value === "undefined") continue;

            if (keyLower.includes("document number") || keyLower === "number") {
              setDocumentNumber(value);
              continue;
            }
            if (
              keyLower.includes("issuing authority") ||
              keyLower.includes("issued by")
            ) {
              setIssuingAuthority(value);
              continue;
            }
            if (keyLower === "name" || keyLower === "full name") continue;

            metaEntries.push({
              key: keyRaw
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase()),
              value,
            });
          }
        }
        setMetadata(metaEntries);
      }

      setOcrProcessed(true);
      setAutomaticStep("review");
    } catch (err) {
      console.error("Document Processing Error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to process document"
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

    // Helper to validate and format date strings
    const validateDateFormat = (dateStr: string): string | null => {
      if (!dateStr || !dateStr.trim()) return null;
      const trimmed = dateStr.trim();
      // Check if already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      // Try to parse and format - handle YYYY-MM format
      if (/^\d{4}-\d{1,2}$/.test(trimmed)) {
        return trimmed + "-01";
      }
      // Try to create a date and format it
      try {
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split("T")[0];
        }
      } catch {
        // ignore
      }
      return null;
    };

    // Validate dates before submitting
    const validExpDate = validateDateFormat(expirationDate);
    const validIssueDate = validateDateFormat(issueDate);
    const validReminderDate = validateDateFormat(reminderDate);

    if (config.hasExpiry && expirationDate && !validExpDate) {
      setError("Invalid expiration date format. Please use YYYY-MM-DD format.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("type", type);
      if (validExpDate) formData.append("expiration_date", validExpDate);
      if (validReminderDate)
        formData.append("reminder_date", validReminderDate);
      if (notes.trim()) formData.append("notes", notes.trim());
      if (documentNumber.trim())
        formData.append("document_number", documentNumber.trim());
      if (issueDate && validIssueDate)
        formData.append("issue_date", validIssueDate);
      if (issuingAuthority.trim())
        formData.append("issuing_authority", issuingAuthority.trim());

      // Send metadata as JSON string
      if (metadata.length > 0) {
        const metadataObj = metadata.reduce((acc, { key, value }) => {
          if (key.trim() && value.trim()) {
            acc[key.trim()] = value.trim();
          }
          return acc;
        }, {} as Record<string, string>);
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden"
          >
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

            <div className="p-5 max-h-[70vh] overflow-y-auto">
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

              {mode === "automatic" && automaticStep === "upload" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Document Side
                    </label>
                    <div className="flex gap-2">
                      {(["front", "back", "both"] as const).map((side) => (
                        <button
                          key={side}
                          onClick={() => setCardSide(side)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            cardSide === side
                              ? "bg-[#A8BBA3] text-white"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          }`}
                        >
                          {side === "front"
                            ? "Front Only"
                            : side === "back"
                            ? "Back Only"
                            : "Both Sides"}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1.5">
                      ID cards: Select &quot;Both Sides&quot; to scan front and
                      back for complete data extraction
                    </p>
                  </div>

                  {/* Single upload for front/back mode */}
                  {cardSide !== "both" && (
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragActive(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          if (cardSide === "front") {
                            setFrontFile(e.dataTransfer.files[0]);
                          } else {
                            setBackFile(e.dataTransfer.files[0]);
                          }
                          setFile(e.dataTransfer.files[0]);
                          setError(null);
                        }
                      }}
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                        dragActive
                          ? "border-[#A8BBA3] bg-[#A8BBA3]/5"
                          : (cardSide === "front" ? frontFile : backFile) ||
                            file
                          ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                          : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600"
                      }`}
                    >
                      <input
                        type="file"
                        onChange={(e) => {
                          handleFileChange(e);
                          if (e.target.files && e.target.files[0]) {
                            if (cardSide === "front") {
                              setFrontFile(e.target.files[0]);
                            } else {
                              setBackFile(e.target.files[0]);
                            }
                          }
                        }}
                        accept="image/*,.pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {(cardSide === "front" ? frontFile : backFile) || file ? (
                        <div className="space-y-2">
                          <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {(cardSide === "front" ? frontFile : backFile)
                              ?.name || file?.name}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {(
                              ((cardSide === "front" ? frontFile : backFile) ||
                                file)!.size /
                              1024 /
                              1024
                            ).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-10 w-10 text-neutral-400 mx-auto" />
                          <p className="font-medium text-neutral-900 dark:text-white">
                            Drop your document ({cardSide} side) here
                          </p>
                          <p className="text-sm text-neutral-500">
                            or click to browse
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dual upload for both sides */}
                  {cardSide === "both" && (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Front side upload */}
                      <div
                        onDragEnter={(e) => {
                          e.preventDefault();
                          setActiveDragZone("front");
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setActiveDragZone(null);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          setActiveDragZone(null);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            setFrontFile(e.dataTransfer.files[0]);
                            setError(null);
                          }
                        }}
                        className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                          activeDragZone === "front"
                            ? "border-[#A8BBA3] bg-[#A8BBA3]/5"
                            : frontFile
                            ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                            : "border-neutral-300 dark:border-neutral-700"
                        }`}
                      >
                        <input
                          type="file"
                          onChange={(e) =>
                            handleFrontBackFileChange(e, "front")
                          }
                          accept="image/*,.pdf"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {frontFile ? (
                          <div className="space-y-1">
                            <CheckCircle className="h-6 w-6 text-green-500 mx-auto" />
                            <p className="font-medium text-sm text-neutral-900 dark:text-white truncate">
                              {frontFile.name}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFrontFile(null);
                              }}
                              className="text-xs text-red-500 hover:text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Upload className="h-6 w-6 text-neutral-400 mx-auto" />
                            <p className="font-medium text-sm text-neutral-900 dark:text-white">
                              Front Side
                            </p>
                            <p className="text-xs text-neutral-500">
                              Drop or click
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Back side upload */}
                      <div
                        onDragEnter={(e) => {
                          e.preventDefault();
                          setActiveDragZone("back");
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setActiveDragZone(null);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          setActiveDragZone(null);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            setBackFile(e.dataTransfer.files[0]);
                            setError(null);
                          }
                        }}
                        className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                          activeDragZone === "back"
                            ? "border-[#A8BBA3] bg-[#A8BBA3]/5"
                            : backFile
                            ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                            : "border-neutral-300 dark:border-neutral-700"
                        }`}
                      >
                        <input
                          type="file"
                          onChange={(e) => handleFrontBackFileChange(e, "back")}
                          accept="image/*,.pdf"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {backFile ? (
                          <div className="space-y-1">
                            <CheckCircle className="h-6 w-6 text-green-500 mx-auto" />
                            <p className="font-medium text-sm text-neutral-900 dark:text-white truncate">
                              {backFile.name}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBackFile(null);
                              }}
                              className="text-xs text-red-500 hover:text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <RotateCcw className="h-6 w-6 text-neutral-400 mx-auto" />
                            <p className="font-medium text-sm text-neutral-900 dark:text-white">
                              Back Side
                            </p>
                            <p className="text-xs text-neutral-500">
                              Drop or click
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={processWithOCR}
                    disabled={
                      cardSide === "both"
                        ? !frontFile && !backFile
                        : cardSide === "front"
                        ? !frontFile && !file
                        : !backFile && !file
                    }
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
                  {/* OCR Confidence Indicator */}
                  {mode === "automatic" && ocrConfidence > 0 && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                        ocrConfidence >= 70
                          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          : ocrConfidence >= 50
                          ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                          : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {ocrConfidence >= 70 ? (
                        <CheckCircle className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                      )}
                      <div>
                        <span className="font-medium">
                          OCR Confidence: {ocrConfidence.toFixed(0)}%
                        </span>
                        {ocrConfidence < 70 && (
                          <span className="ml-1">
                            — Please verify extracted fields carefully
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Low confidence warning from extraction */}
                  {extractedData?.low_confidence_warning && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {extractedData.low_confidence_warning}
                    </div>
                  )}

                  {/* Puter.js suggestion when fallback was used */}
                  {mode === "automatic" && usedFallback && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-400 text-sm">
                      <Sparkles className="h-4 w-4 shrink-0" />
                      <div>
                        <span className="font-medium">
                          Want better results?
                        </span>
                        <span className="ml-1">
                          Sign in to{" "}
                          <a
                            href="https://puter.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            Puter.js
                          </a>{" "}
                          for GPT-4o powered extraction.
                        </span>
                      </div>
                    </div>
                  )}

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
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                                    isSelected
                                      ? "bg-[#A8BBA3] text-white"
                                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                  }`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {docType}
                                </button>
                              );
                            }
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
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                                    isSelected
                                      ? "bg-[#A8BBA3] text-white"
                                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                  }`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {docType}
                                </button>
                              );
                            }
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
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                                isSelected
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
                                (_, i) => i !== index
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
                        className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                          dragActive
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
