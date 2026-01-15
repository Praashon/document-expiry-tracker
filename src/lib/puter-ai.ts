"use client";

// Puter.js AI service for document OCR processing
// This uses Puter.js which provides free access to GPT-4o, Claude, Gemini etc.

declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (
          prompt: string | Array<{ role: string; content: any }>,
          imageOrOptions?: string | { model?: string; stream?: boolean },
          options?: { model?: string; stream?: boolean }
        ) => Promise<any>;
      };
      auth: {
        isSignedIn: () => boolean;
        signIn: () => Promise<void>;
        getUser: () => Promise<{ username: string } | null>;
      };
    };
  }
}

// Custom error for Puter authentication failures
export class PuterAuthError extends Error {
  constructor(message: string = "Puter.js authentication required") {
    super(message);
    this.name = "PuterAuthError";
  }
}

let puterLoaded = false;
let loadPromise: Promise<void> | null = null;

// Load Puter.js script dynamically
export async function loadPuterJS(): Promise<void> {
  if (puterLoaded && window.puter) {
    return;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.puter) {
      puterLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.async = true;
    script.onload = () => {
      puterLoaded = true;
      resolve();
    };
    script.onerror = () => {
      reject(new Error("Failed to load Puter.js"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

// Check if user is authenticated with Puter
export async function isPuterAuthenticated(): Promise<boolean> {
  try {
    await loadPuterJS();
    if (!window.puter?.auth) {
      return false;
    }
    return window.puter.auth.isSignedIn();
  } catch {
    return false;
  }
}

// Convert File to base64 data URL
async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface PuterAIDocumentResult {
  title: string | null;
  type: string;
  name: string | null;
  document_number: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  issuing_authority: string | null;
  metadata: Record<string, any>;
  raw_response: string;
}

const SYSTEM_PROMPT = `You are an expert document analyzer. Analyze this document image and extract ALL information visible.

Return a JSON object with these fields (use null if not found):
{
  "title": "Document title (e.g., 'Driving License', 'National ID Card')",
  "type": "One of: Rent Agreement, Insurance, Subscription, License, Warranty, Contract, Citizenship, PAN Card, National ID, Passport, Driving License, Voter ID, Birth Certificate, Other",
  "name": "Full name of the document holder",
  "document_number": "Any ID/document number visible",
  "issue_date": "Issue date in YYYY-MM-DD format",
  "expiration_date": "Expiry date in YYYY-MM-DD format", 
  "issuing_authority": "Issuing organization/authority",
  "date_of_birth": "DOB if visible in YYYY-MM-DD format",
  "nationality": "Nationality if visible",
  "address": "Address if visible",
  "father_name": "Father's name if visible",
  "mother_name": "Mother's name if visible",
  "gender": "Gender if visible",
  "blood_group": "Blood group if visible"
}

IMPORTANT:
- Extract dates in YYYY-MM-DD format. Convert DD.MM.YYYY or DD/MM/YYYY to YYYY-MM-DD
- Extract ALL text visible on the document
- For document_number, look for any ID number, license number, passport number, etc.
- Return ONLY valid JSON, no markdown code blocks
- Do NOT return "null" as a string, use actual null`;

export async function analyzeDocumentWithPuter(
  file: File
): Promise<PuterAIDocumentResult> {
  await loadPuterJS();

  if (!window.puter) {
    throw new Error("Puter.js not available");
  }

  const imageDataUrl = await fileToDataURL(file);

  // Use GPT-4o for best image analysis (Puter provides free access)
  const response = await window.puter.ai.chat(
    SYSTEM_PROMPT,
    imageDataUrl,
    { model: "gpt-4o" }
  );

  // Parse the response
  let responseText = "";
  if (typeof response === "string") {
    responseText = response;
  } else if (response?.message?.content) {
    responseText = response.message.content;
  } else if (response?.text) {
    responseText = response.text;
  } else {
    responseText = JSON.stringify(response);
  }

  // Clean up markdown code blocks if present
  let cleanResponse = responseText.trim();
  if (cleanResponse.startsWith("```json")) {
    cleanResponse = cleanResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanResponse.startsWith("```")) {
    cleanResponse = cleanResponse.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  try {
    const data = JSON.parse(cleanResponse);
    
    // Clean null strings
    const cleanValue = (val: any): string | null => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      if (str === "" || str.toLowerCase() === "null" || str.toLowerCase() === "undefined") {
        return null;
      }
      return str;
    };

    // Build metadata from extra fields
    const metadata: Record<string, any> = {};
    const extraFields = ["date_of_birth", "nationality", "address", "father_name", "mother_name", "gender", "blood_group"];
    for (const field of extraFields) {
      const val = cleanValue(data[field]);
      if (val) {
        metadata[field] = val;
      }
    }
    // Add any other fields that aren't in our main structure
    for (const [key, value] of Object.entries(data)) {
      if (!["title", "type", "name", "document_number", "issue_date", "expiration_date", "issuing_authority", ...extraFields].includes(key)) {
        const cleaned = cleanValue(value);
        if (cleaned) {
          metadata[key] = cleaned;
        }
      }
    }

    return {
      title: cleanValue(data.title),
      type: cleanValue(data.type) || "Other",
      name: cleanValue(data.name),
      document_number: cleanValue(data.document_number),
      issue_date: cleanValue(data.issue_date),
      expiration_date: cleanValue(data.expiration_date),
      issuing_authority: cleanValue(data.issuing_authority),
      metadata,
      raw_response: responseText,
    };
  } catch (e) {
    console.error("Failed to parse Puter AI response:", cleanResponse);
    return {
      title: null,
      type: "Other",
      name: null,
      document_number: null,
      issue_date: null,
      expiration_date: null,
      issuing_authority: null,
      metadata: {},
      raw_response: responseText,
    };
  }
}

// Analyze multiple images (front/back)
export async function analyzeMultipleDocumentsWithPuter(
  files: { front?: File; back?: File }
): Promise<PuterAIDocumentResult> {
  const results: PuterAIDocumentResult[] = [];

  if (files.front) {
    const frontResult = await analyzeDocumentWithPuter(files.front);
    results.push(frontResult);
  }

  if (files.back) {
    const backResult = await analyzeDocumentWithPuter(files.back);
    results.push(backResult);
  }

  if (results.length === 0) {
    throw new Error("No files provided");
  }

  if (results.length === 1) {
    return results[0];
  }

  // Merge results from front and back
  const merged: PuterAIDocumentResult = {
    title: results[0].title || results[1]?.title || null,
    type: results[0].type !== "Other" ? results[0].type : (results[1]?.type || "Other"),
    name: results[0].name || results[1]?.name || null,
    document_number: results[0].document_number || results[1]?.document_number || null,
    issue_date: results[0].issue_date || results[1]?.issue_date || null,
    expiration_date: results[0].expiration_date || results[1]?.expiration_date || null,
    issuing_authority: results[0].issuing_authority || results[1]?.issuing_authority || null,
    metadata: { ...results[1]?.metadata, ...results[0].metadata },
    raw_response: results.map(r => r.raw_response).join("\n---\n"),
  };

  return merged;
}
