import { createWorker, Worker } from "tesseract.js";

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface ExtractedDocumentData {
  title: string | null;
  type: string;
  expiration_date: string | null;
  issue_date: string | null;
  name: string | null;
  raw_text: string;
  dates_found: string[];
  confidence: number;
  low_confidence_warning?: string;
  metadata?: Record<string, any>;
}

let workerInstance: Worker | null = null;
let isInitializing = false;
let initPromise: Promise<Worker> | null = null;

export async function getOCRWorker(): Promise<Worker> {
  if (workerInstance) {
    return workerInstance;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  isInitializing = true;
  const languages = "eng+hin+nep+nld+spa+chi_sim";
  initPromise = createWorker(languages, 1, {
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
  });

  try {
    workerInstance = await initPromise;
    return workerInstance;
  } finally {
    isInitializing = false;
  }
}

export async function terminateOCRWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
}

export async function performOCR(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  const worker = await getOCRWorker();

  const imageUrl = URL.createObjectURL(file);

  try {
    const result = await worker.recognize(
      imageUrl,
      {},
      {
        text: true,
      }
    );

    onProgress?.(100);

    return {
      text: result.data.text,
      confidence: result.data.confidence,
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function extractDates(text: string): string[] {
  const datePatterns = [
    // MM/DD/YYYY or MM-DD-YYYY
    /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
    // DD/MM/YYYY or DD-MM-YYYY
    /\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](19|20)\d{2}\b/g,
    // YYYY/MM/DD or YYYY-MM-DD
    /\b(19|20)\d{2}[\/\-](0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])\b/g,
    // DD.MM.YYYY (dot separator common in some regions)
    /\b(0?[1-9]|[12]\d|3[01])\.(0?[1-9]|1[0-2])\.(19|20)\d{2}\b/g,
    // Full month: January 15, 2025 or January 15 2025
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(0?[1-9]|[12]\d|3[01]),?\s+(19|20)\d{2}\b/gi,
    // Full month: 15 January 2025
    /\b(0?[1-9]|[12]\d|3[01])\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19|20)\d{2}\b/gi,
    // Abbreviated month: Jan 15, 2025 or Jan. 15 2025
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(0?[1-9]|[12]\d|3[01]),?\s+(19|20)\d{2}\b/gi,
    // Abbreviated month: 15 Jan 2025 or 15-Jan-2025
    /\b(0?[1-9]|[12]\d|3[01])[\s\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?[\s\-](19|20)\d{2}\b/gi,
    // Ordinal dates: 1st January 2025, 2nd Feb 2025
    /\b(0?[1-9]|[12]\d|3[01])(st|nd|rd|th)\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(19|20)\d{2}\b/gi,
    // Space separated: DD MM YYYY
    /\b(0?[1-9]|[12]\d|3[01])\s+(0?[1-9]|1[0-2])\s+(19|20)\d{2}\b/g,
    // Nepali BS dates
    /\b(२०[७-९]\d)[\/\-](0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])\b/g,
    /\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](२०[७-९]\d)\b/g,
  ];

  const dates: string[] = [];

  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  }

  return [...new Set(dates)];
}

function findDateNearKeyword(
  text: string,
  dates: string[],
  keywords: string[],
  maxDistance: number = 100
): string | null {
  const lowerText = text.toLowerCase();

  for (const keyword of keywords) {
    const keywordIndex = lowerText.indexOf(keyword.toLowerCase());
    if (keywordIndex !== -1) {
      // Look for dates after the keyword first
      for (const date of dates) {
        const dateIndex = text.indexOf(date);
        if (
          dateIndex > keywordIndex &&
          dateIndex - keywordIndex < maxDistance
        ) {
          return date;
        }
      }
      // Also check for dates slightly before the keyword (label might be after date)
      for (const date of dates) {
        const dateIndex = text.indexOf(date);
        if (dateIndex < keywordIndex && keywordIndex - dateIndex < 50) {
          return date;
        }
      }
    }
  }

  return null;
}

function findExpirationDate(text: string, dates: string[]): string | null {
  const expirationKeywords = [
    "expir",
    "valid until",
    "valid through",
    "valid thru",
    "valid upto",
    "valid up to",
    "expires on",
    "expiration date",
    "date of expiry",
    "exp date",
    "exp:",
    "exp.",
    "due date",
    "renewal date",
    "end date",
    "termination",
    "maturity",
    "date of expiration",
    "validity",
    // Nepali
    "मिति सम्म",
    "अन्तिम मिति",
    "समाप्ति",
    "म्याद",
    "मान्य मिति",
  ];

  const foundDate = findDateNearKeyword(text, dates, expirationKeywords);
  if (foundDate) {
    return foundDate;
  }

  // Fallback: if multiple dates, return the latest one (likely expiry)
  if (dates.length > 0) {
    const parsedDates = dates
      .map((d) => {
        try {
          return { original: d, parsed: new Date(d) };
        } catch {
          return null;
        }
      })
      .filter((d) => d && !isNaN(d.parsed.getTime())) as {
      original: string;
      parsed: Date;
    }[];

    if (parsedDates.length > 0) {
      parsedDates.sort((a, b) => b.parsed.getTime() - a.parsed.getTime());
      return parsedDates[0].original;
    }
  }

  return null;
}

function findIssueDate(text: string, dates: string[]): string | null {
  const issueKeywords = [
    "issue date",
    "date of issue",
    "issued on",
    "issued:",
    "issued",
    "date issued",
    "doi",
    "issue:",
    "issuance date",
    // Nepali
    "जारी मिति",
    "जारी",
    "प्रदान मिति",
  ];

  const foundDate = findDateNearKeyword(text, dates, issueKeywords);
  if (foundDate) {
    return foundDate;
  }

  // Fallback: if multiple dates, return the earliest one (likely issue date)
  if (dates.length > 1) {
    const parsedDates = dates
      .map((d) => {
        try {
          return { original: d, parsed: new Date(d) };
        } catch {
          return null;
        }
      })
      .filter((d) => d && !isNaN(d.parsed.getTime())) as {
      original: string;
      parsed: Date;
    }[];

    if (parsedDates.length > 1) {
      parsedDates.sort((a, b) => a.parsed.getTime() - b.parsed.getTime());
      return parsedDates[0].original;
    }
  }

  return null;
}

function extractTitle(text: string): string | null {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);

  const titleKeywords = [
    "policy",
    "certificate",
    "agreement",
    "contract",
    "license",
    "permit",
    "registration",
    "insurance",
    "lease",
    "rental",
    "subscription",
    "invoice",
    "receipt",
    "statement",
    "नागरिकता",
    "प्रमाणपत्र",
    "अनुमतिपत्र",
    "लाइसेन्स",
    "बीमा",
    "सम्झौता",
  ];

  for (const line of lines.slice(0, 10)) {
    const lowerLine = line.toLowerCase();
    for (const keyword of titleKeywords) {
      if (lowerLine.includes(keyword.toLowerCase())) {
        return line.trim().substring(0, 100);
      }
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 5 && trimmed.length < 100) {
      return trimmed;
    }
  }

  return null;
}

function detectDocumentType(
  text: string
): "Rent" | "Insurance" | "Subscription" | "License" | "Other" {
  const lowerText = text.toLowerCase();

  const typePatterns = {
    Insurance: [
      "insurance",
      "policy",
      "coverage",
      "premium",
      "deductible",
      "claim",
      "insured",
      "beneficiary",
      "बीमा",
      "प्रिमियम",
      "दाबी",
    ],
    Rent: [
      "lease",
      "rental",
      "tenant",
      "landlord",
      "rent",
      "property",
      "apartment",
      "premises",
      "भाडा",
      "घरधनी",
      "भाडामा",
    ],
    License: [
      "license",
      "licence",
      "permit",
      "registration",
      "certified",
      "authorized",
      "driver",
      "लाइसेन्स",
      "अनुमति",
      "प्रमाणपत्र",
      "नागरिकता",
      "चालक",
    ],
    Subscription: [
      "subscription",
      "membership",
      "recurring",
      "monthly",
      "annual",
      "renew",
      "plan",
      "सदस्यता",
      "मासिक",
      "वार्षिक",
    ],
  };

  let maxScore = 0;
  let detectedType:
    | "Rent"
    | "Insurance"
    | "Subscription"
    | "License"
    | "Other" = "Other";

  for (const [type, keywords] of Object.entries(typePatterns)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      detectedType = type as
        | "Rent"
        | "Insurance"
        | "Subscription"
        | "License"
        | "Other";
    }
  }

  return detectedType;
}

function normalizeDate(dateStr: string): string | null {
  try {
    if (!dateStr || dateStr.trim() === "") {
      return null;
    }

    const nepaliToEnglish: Record<string, string> = {
      "०": "0",
      "१": "1",
      "२": "2",
      "३": "3",
      "४": "4",
      "५": "5",
      "६": "6",
      "७": "7",
      "८": "8",
      "९": "9",
    };

    let normalizedStr = dateStr.trim();
    for (const [nepali, english] of Object.entries(nepaliToEnglish)) {
      normalizedStr = normalizedStr.replace(new RegExp(nepali, "g"), english);
    }

    // Handle DD.MM.YYYY format (European/Argentine style)
    const dotSeparated = normalizedStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotSeparated) {
      const [, day, month, year] = dotSeparated;
      normalizedStr = `${year}-${month.padStart(2, "0")}-${day.padStart(
        2,
        "0"
      )}`;
    }

    // Handle DD/MM/YYYY format
    const slashSeparated = normalizedStr.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );
    if (slashSeparated) {
      const [, day, month, year] = slashSeparated;
      // Assume DD/MM/YYYY if day > 12, otherwise ambiguous but assume DD/MM
      if (parseInt(day) > 12 || parseInt(month) <= 12) {
        normalizedStr = `${year}-${month.padStart(2, "0")}-${day.padStart(
          2,
          "0"
        )}`;
      }
    }

    // Handle partial date formats
    // YYYY-MM format (e.g., "2022-05") - add day 01
    if (/^\d{4}-\d{1,2}$/.test(normalizedStr)) {
      normalizedStr = normalizedStr + "-01";
    }
    // YYYY format only - add month and day
    if (/^\d{4}$/.test(normalizedStr)) {
      normalizedStr = normalizedStr + "-01-01";
    }

    const date = new Date(normalizedStr);
    if (isNaN(date.getTime())) {
      return null;
    }

    const isoDate = date.toISOString().split("T")[0];

    // Validate the final format is YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return null;
    }

    return isoDate;
  } catch {
    return null;
  }
}

export function extractDocumentData(
  text: string,
  confidence: number = 0
): ExtractedDocumentData {
  if (!text) {
    return {
      title: null,
      type: "Other",
      expiration_date: null,
      issue_date: null,
      name: null,
      raw_text: "",
      dates_found: [],
      confidence: 0,
    };
  }
  const dates = extractDates(text);
  const expirationDate = findExpirationDate(text, dates);
  const issueDate = findIssueDate(text, dates);
  const title = extractTitle(text);
  const documentType = detectDocumentType(text);
  const normalizedExpDate = expirationDate
    ? normalizeDate(expirationDate)
    : null;
  const normalizedIssueDate = issueDate ? normalizeDate(issueDate) : null;

  // Generate low confidence warning if needed
  let lowConfidenceWarning: string | undefined;
  if (confidence < 70 && confidence > 0) {
    lowConfidenceWarning = `OCR confidence is low (${confidence.toFixed(
      0
    )}%). Please verify extracted fields.`;
  }

  return {
    title,
    type: documentType,
    expiration_date: normalizedExpDate,
    issue_date: normalizedIssueDate,
    name: null, // Will be populated by AI
    raw_text: text.substring(0, 2000),
    dates_found: dates,
    confidence,
    low_confidence_warning: lowConfidenceWarning,
  };
}

async function processWithAI(
  text: string
): Promise<Partial<ExtractedDocumentData>> {
  try {
    const response = await fetch("/api/process-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error("AI processing failed");
    }

    const data = await response.json();

    const cleanValue = (val: any): string | null => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      if (
        str === "" ||
        str.toLowerCase() === "null" ||
        str.toLowerCase() === "undefined"
      ) {
        return null;
      }
      return str;
    };

    // Extract name from metadata or top-level if provided
    const extractedName =
      cleanValue(data.name) ||
      cleanValue(data.metadata?.name) ||
      cleanValue(data.metadata?.full_name) ||
      null;

    // Validate and normalize dates from AI
    const validateDate = (
      dateStr: string | null | undefined
    ): string | null => {
      if (!dateStr) return null;
      const cleaned = cleanValue(dateStr);
      if (!cleaned) return null;
      // Use the normalizeDate function to validate the date format
      return normalizeDate(cleaned);
    };

    // Clean the metadata object to remove null strings
    const cleanedMetadata: Record<string, any> = {};
    if (data.metadata) {
      for (const [key, value] of Object.entries(data.metadata)) {
        const cleaned = cleanValue(value);
        if (cleaned !== null) {
          cleanedMetadata[key] = cleaned;
        }
      }
    }

    return {
      title: cleanValue(data.title),
      type: cleanValue(data.type) || "Other",
      expiration_date: validateDate(data.expiration_date),
      issue_date: validateDate(data.issue_date || data.metadata?.issue_date),
      name: extractedName,
      metadata: cleanedMetadata,
    };
  } catch (error) {
    console.error("AI processing error:", error);
    return {};
  }
}

export async function processDocument(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ExtractedDocumentData> {
  const ocrResult = await performOCR(file, onProgress);
  const text = ocrResult.text || "";
  const confidence = ocrResult.confidence || 0;

  const legacyData = extractDocumentData(text, confidence);

  const aiData = await processWithAI(text);

  return {
    ...legacyData,
    ...aiData,
    // Ensure we keep raw text and found dates
    raw_text: text,
    dates_found: legacyData.dates_found,
    // Keep confidence from OCR
    confidence: confidence,
    low_confidence_warning: legacyData.low_confidence_warning,
    // Merge metadata if legacy found anything (unlikely, but safe)
    metadata: aiData.metadata || {},
  };
}

// Process multiple files (for front/back document support)
export async function processMultipleDocuments(
  files: { front?: File; back?: File },
  onProgress?: (progress: number) => void
): Promise<ExtractedDocumentData> {
  const results: { text: string; confidence: number }[] = [];
  const totalFiles = (files.front ? 1 : 0) + (files.back ? 1 : 0);
  let processedFiles = 0;

  // Process front side
  if (files.front) {
    const ocrResult = await performOCR(files.front, (p) => {
      onProgress?.(p * (1 / totalFiles));
    });
    results.push({
      text: `--- FRONT SIDE ---\n${ocrResult.text}`,
      confidence: ocrResult.confidence,
    });
    processedFiles++;
  }

  // Process back side
  if (files.back) {
    const ocrResult = await performOCR(files.back, (p) => {
      onProgress?.(
        (processedFiles / totalFiles + (p / 100) * (1 / totalFiles)) * 100
      );
    });
    results.push({
      text: `\n--- BACK SIDE ---\n${ocrResult.text}`,
      confidence: ocrResult.confidence,
    });
  }

  const combinedText = results.map((r) => r.text).join("\n");
  const avgConfidence =
    results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  const legacyData = extractDocumentData(combinedText, avgConfidence);

  const aiData = await processWithAI(combinedText);

  return {
    ...legacyData,
    ...aiData,
    raw_text: combinedText,
    dates_found: legacyData.dates_found,
    confidence: avgConfidence,
    low_confidence_warning: legacyData.low_confidence_warning,
    metadata: aiData.metadata || {},
  };
}
