import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Tesseract from "tesseract.js";

function extractDates(text: string): string[] {
  const datePatterns = [
    /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
    /\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](19|20)\d{2}\b/g,
    /\b(19|20)\d{2}[\/\-](0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])\b/g,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(0?[1-9]|[12]\d|3[01]),?\s+(19|20)\d{2}\b/gi,
    /\b(0?[1-9]|[12]\d|3[01])\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19|20)\d{2}\b/gi,
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(0?[1-9]|[12]\d|3[01]),?\s+(19|20)\d{2}\b/gi,
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
  ];

  const lowerText = text.toLowerCase();

  for (const keyword of expirationKeywords) {
    const keywordIndex = lowerText.indexOf(keyword);
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
  ];

  for (const line of lines.slice(0, 10)) {
    const lowerLine = line.toLowerCase();
    for (const keyword of titleKeywords) {
      if (lowerLine.includes(keyword)) {
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
  text: string,
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
    ],
    License: [
      "license",
      "licence",
      "permit",
      "registration",
      "certified",
      "authorized",
      "driver",
    ],
    Subscription: [
      "subscription",
      "membership",
      "recurring",
      "monthly",
      "annual",
      "renew",
      "plan",
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
      if (lowerText.includes(keyword)) {
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
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, BMP) or PDF.",
        },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const {
      data: { text },
    } = await Tesseract.recognize(buffer, "eng", {
      logger: () => {},
    });

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from the document. Please try a clearer image.",
          extracted: {
            title: null,
            type: "Other",
            expiration_date: null,
            raw_text: "",
            dates_found: [],
          },
        },
        { status: 200 },
      );
    }

    const dates = extractDates(text);
    const expirationDate = findExpirationDate(text, dates);
    const title = extractTitle(text);
    const documentType = detectDocumentType(text);
    const normalizedExpDate = expirationDate
      ? normalizeDate(expirationDate)
      : null;

    return NextResponse.json({
      success: true,
      extracted: {
        title: title,
        type: documentType,
        expiration_date: normalizedExpDate,
        raw_text: text.substring(0, 2000),
        dates_found: dates,
      },
    });
  } catch (error) {
    console.error("OCR Error:", error);
    return NextResponse.json(
      { error: "Error processing document" },
      { status: 500 },
    );
  }
}
