import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export type DocumentType =
  | "Rent Agreement"
  | "Insurance"
  | "Subscription"
  | "License"
  | "Warranty"
  | "Contract"
  | "Citizenship"
  | "PAN Card"
  | "National ID"
  | "Passport"
  | "Driving License"
  | "Voter ID"
  | "Birth Certificate"
  | "Other";

export type DocumentCategory = "expiring" | "identity" | "other";

export type DocumentStatus =
  | "valid"
  | "expiring_soon"
  | "expired"
  | "no_expiry";

export interface Document {
  id?: string;
  title: string;
  type: DocumentType;
  category: DocumentCategory;
  expiration_date?: string | null;
  reminder_date?: string | null;
  notes?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  document_number?: string | null;
  issue_date?: string | null;
  issuing_authority?: string | null;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
}

export const DOCUMENT_TYPE_CONFIG: Record<
  DocumentType,
  {
    category: DocumentCategory;
    color: string;
    bgColor: string;
    hasExpiry: boolean;
    hasDocumentNumber: boolean;
  }
> = {
  "Rent Agreement": {
    category: "expiring",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    hasExpiry: true,
    hasDocumentNumber: false,
  },
  Insurance: {
    category: "expiring",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    hasExpiry: true,
    hasDocumentNumber: true,
  },
  Subscription: {
    category: "expiring",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-900/20",
    hasExpiry: true,
    hasDocumentNumber: false,
  },
  License: {
    category: "expiring",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    hasExpiry: true,
    hasDocumentNumber: true,
  },
  Warranty: {
    category: "expiring",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    hasExpiry: true,
    hasDocumentNumber: false,
  },
  Contract: {
    category: "expiring",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/20",
    hasExpiry: true,
    hasDocumentNumber: false,
  },
  Citizenship: {
    category: "identity",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    hasExpiry: false,
    hasDocumentNumber: true,
  },
  "PAN Card": {
    category: "identity",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    hasExpiry: false,
    hasDocumentNumber: true,
  },
  "National ID": {
    category: "identity",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
    hasExpiry: true,
    hasDocumentNumber: true,
  },
  Passport: {
    category: "identity",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    hasExpiry: true,
    hasDocumentNumber: true,
  },
  "Driving License": {
    category: "identity",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    hasExpiry: true,
    hasDocumentNumber: true,
  },
  "Voter ID": {
    category: "identity",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-900/20",
    hasExpiry: false,
    hasDocumentNumber: true,
  },
  "Birth Certificate": {
    category: "identity",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-900/20",
    hasExpiry: false,
    hasDocumentNumber: true,
  },
  Other: {
    category: "other",
    color: "text-neutral-600 dark:text-neutral-400",
    bgColor: "bg-neutral-100 dark:bg-neutral-800",
    hasExpiry: true,
    hasDocumentNumber: false,
  },
};

export const DOCUMENT_TYPES_BY_CATEGORY: Record<
  DocumentCategory,
  DocumentType[]
> = {
  expiring: [
    "Rent Agreement",
    "Insurance",
    "Subscription",
    "License",
    "Warranty",
    "Contract",
  ],
  identity: [
    "Citizenship",
    "PAN Card",
    "National ID",
    "Passport",
    "Driving License",
    "Voter ID",
    "Birth Certificate",
  ],
  other: ["Other"],
};
