import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type DocumentType =
  | "Rent"
  | "Insurance"
  | "Subscription"
  | "License"
  | "Other";

export type DocumentStatus = "valid" | "expiring_soon" | "expired";

export interface Document {
  id?: string;
  title: string;
  type: DocumentType;
  expiration_date: string;
  reminder_date?: string | null;
  notes?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
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
