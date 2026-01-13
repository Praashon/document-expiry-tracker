import { createWorker, Worker } from "tesseract.js";

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface ExtractedDocumentData {
  title: string | null;
  type: string; // Changed from stringent union to string to allow AI's flexibility
  expiration_date: string | null;
  raw_text: string;
  dates_found: string[];
  metadata?: Record<string, any>; // New field for dynamic data
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
  initPromise = createWorker("eng+nep", 1, {
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
    /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
    /\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](19|20)\d{2}\b/g,
    /\b(19|20)\d{2}[\/\-](0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])\b/g,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(0?[1-9]|[12]\d|3[01]),?\s+(19|20)\d{2}\b/gi,
    /\b(0?[1-9]|[12]\d|3[01])\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19|20)\d{2}\b/gi,
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(0?[1-9]|[12]\d|3[01]),?\s+(19|20)\d{2}\b/gi,
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

function findExpirationDate(text: string, dates: string[]): string | null {
  const expirationKeywords = [
    "expir",
    "valid until",
    "valid through",
    "valid thru",
    "expires on",
    "expiration date",
    "exp date",
    "exp:",
    "due date",
    "renewal date",
    "end date",
    "termination",
    "maturity",
    "मिति सम्म",
    "अन्तिम मिति",
    "समाप्ति",
    "म्याद",
  ];

  const lowerText = text.toLowerCase();

  for (const keyword of expirationKeywords) {
    const keywordIndex = lowerText.indexOf(keyword.toLowerCase());
    if (keywordIndex !== -1) {
      for (const date of dates) {
        const dateIndex = text.indexOf(date);
        if (dateIndex > keywordIndex && dateIndex - keywordIndex < 100) {
          return date;
        }
      }
    }
  }

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

    let normalizedStr = dateStr;
    for (const [nepali, english] of Object.entries(nepaliToEnglish)) {
      normalizedStr = normalizedStr.replace(new RegExp(nepali, "g"), english);
    }

    const date = new Date(normalizedStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

export function extractDocumentData(text: string): ExtractedDocumentData {
  if (!text) {
    return {
      title: null,
      type: "Other",
      expiration_date: null,
      raw_text: "",
      dates_found: [],
    };
  }
  const dates = extractDates(text);
  const expirationDate = findExpirationDate(text, dates);
  const title = extractTitle(text);
  const documentType = detectDocumentType(text);
  const normalizedExpDate = expirationDate
    ? normalizeDate(expirationDate)
    : null;

  return {
    title,
    type: documentType,
    expiration_date: normalizedExpDate,
    raw_text: text.substring(0, 2000),
    dates_found: dates,
  };
}

// Helper to call the AI processing API
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
    return {
      title: data.title,
      type: data.type,
      expiration_date: data.expiration_date,
      metadata: data.metadata,
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
  // 1. Perform OCR (Client-side)
  const ocrResult = await performOCR(file, onProgress);
  const text = ocrResult.text || "";

  // 2. Extract regex-based data (Legacy/Fallback)
  const legacyData = extractDocumentData(text);

  // 3. Process with AI (Server-side)
  // We notify progress as 100% done with OCR, now "Analyzing..."
  const aiData = await processWithAI(text);

  // 4. Merge results (AI takes precedence)
  return {
    ...legacyData,
    ...aiData,
    // Ensure we keep raw text and found dates
    raw_text: text,
    dates_found: legacyData.dates_found,
    // Merge metadata if legacy found anything (unlikely, but safe)
    metadata: aiData.metadata || {},
  };
}
