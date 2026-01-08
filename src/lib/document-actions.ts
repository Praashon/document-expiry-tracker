import { supabaseBrowser } from "./supabase-browser";
import {
  Document,
  DocumentStatus,
  DocumentType,
  DocumentCategory,
  DOCUMENT_TYPE_CONFIG,
} from "./supabase";

interface DbDocument {
  id: string;
  title: string;
  type: string;
  category: string;
  expiration_date: string | null;
  reminder_date: string | null;
  notes: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  document_number: string | null;
  issue_date: string | null;
  issuing_authority: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function getDocumentStatus(
  expirationDate: string | null | undefined,
): DocumentStatus {
  if (!expirationDate) return "no_expiry";

  const now = new Date();
  const expDate = new Date(expirationDate);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (expDate < now) {
    return "expired";
  } else if (expDate <= thirtyDaysFromNow) {
    return "expiring_soon";
  } else {
    return "valid";
  }
}

export function getDaysUntilExpiration(
  expirationDate: string | null | undefined,
): number | null {
  if (!expirationDate) return null;

  const now = new Date();
  const expDate = new Date(expirationDate);
  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function getDocumentCategory(type: DocumentType): DocumentCategory {
  return DOCUMENT_TYPE_CONFIG[type]?.category || "other";
}

export async function uploadFile(file: File, userId: string) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabaseBrowser.storage
    .from("documents")
    .upload(fileName, file);

  if (error) {
    console.error("Error uploading file:", error);
    throw error;
  }

  return data;
}

export function getFileUrl(filePath: string): string {
  const { data } = supabaseBrowser.storage
    .from("documents")
    .getPublicUrl(filePath);
  return data.publicUrl;
}

export async function getFileDownloadUrl(filePath: string): Promise<string> {
  const { data, error } = await supabaseBrowser.storage
    .from("documents")
    .createSignedUrl(filePath, 3600);

  if (error) {
    console.error("Error getting download URL:", error);
    throw error;
  }

  return data.signedUrl;
}

export async function deleteFile(filePath: string) {
  const { error } = await supabaseBrowser.storage
    .from("documents")
    .remove([filePath]);

  if (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}

export async function createDocument(
  data: Omit<Document, "id" | "created_at" | "updated_at">,
) {
  const category = getDocumentCategory(data.type);

  const { data: document, error } = await supabaseBrowser
    .from("documents")
    .insert({
      title: data.title,
      type: data.type,
      category: category,
      expiration_date: data.expiration_date || null,
      reminder_date: data.reminder_date || null,
      notes: data.notes || null,
      file_path: data.file_path || null,
      file_name: data.file_name || null,
      file_type: data.file_type || null,
      file_size: data.file_size || null,
      document_number: data.document_number || null,
      issue_date: data.issue_date || null,
      issuing_authority: data.issuing_authority || null,
      user_id: data.user_id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating document:", error);
    throw error;
  }

  return document;
}

export async function getDocuments(userId: string) {
  const { data, error } = await supabaseBrowser
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getDocuments] Error:", error.message);
    return [];
  }

  return data || [];
}

export async function getDocument(documentId: string) {
  const { data, error } = await supabaseBrowser
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (error) {
    console.error("Error getting document:", error);
    throw error;
  }

  return data;
}

export async function updateDocument(
  documentId: string,
  data: Partial<Omit<Document, "id" | "user_id" | "created_at" | "updated_at">>,
) {
  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  // Update category if type changed
  if (data.type) {
    updateData.category = getDocumentCategory(data.type);
  }

  const { data: document, error } = await supabaseBrowser
    .from("documents")
    .update(updateData)
    .eq("id", documentId)
    .select()
    .single();

  if (error) {
    console.error("Error updating document:", error);
    throw error;
  }

  return document;
}

export async function deleteDocument(documentId: string, filePath?: string) {
  if (filePath) {
    try {
      await deleteFile(filePath);
    } catch (fileError) {
      console.warn("Could not delete file:", fileError);
    }
  }

  const { error } = await supabaseBrowser
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
}

export async function getDocumentsByStatus(
  userId: string,
  status: DocumentStatus,
) {
  const documents = await getDocuments(userId);
  return documents.filter((doc: DbDocument) => {
    return getDocumentStatus(doc.expiration_date) === status;
  });
}

export async function getDocumentsByCategory(
  userId: string,
  category: DocumentCategory,
) {
  const { data, error } = await supabaseBrowser
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getting documents by category:", error);
    return [];
  }

  return data || [];
}

export async function getDocumentStats(userId: string) {
  const documents = await getDocuments(userId);

  const total = documents.length;
  let valid = 0;
  let expiringSoon = 0;
  let expired = 0;
  let noExpiry = 0;
  let identity = 0;
  let expiring = 0;

  documents.forEach((doc: DbDocument) => {
    const status = getDocumentStatus(doc.expiration_date);
    if (status === "valid") valid++;
    else if (status === "expiring_soon") expiringSoon++;
    else if (status === "expired") expired++;
    else if (status === "no_expiry") noExpiry++;

    // Count by category
    if (doc.category === "identity") identity++;
    else if (doc.category === "expiring") expiring++;
  });

  return {
    total,
    valid,
    expiringSoon,
    expired,
    noExpiry,
    identity,
    expiring,
  };
}

export async function getDocumentsExpiringWithin(userId: string, days: number) {
  const documents = await getDocuments(userId);
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return documents.filter((doc: DbDocument) => {
    if (!doc.expiration_date) return false;
    const expDate = new Date(doc.expiration_date);
    return expDate >= now && expDate <= futureDate;
  });
}

export async function searchDocuments(userId: string, searchTerm: string) {
  const { data, error } = await supabaseBrowser
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .or(
      `title.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%,document_number.ilike.%${searchTerm}%`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error searching documents:", error);
    return [];
  }

  return data || [];
}

export async function getDocumentsByType(userId: string, type: DocumentType) {
  const { data, error } = await supabaseBrowser
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getting documents by type:", error);
    return [];
  }

  return data || [];
}

export type {
  Document,
  DocumentType,
  DocumentStatus,
  DocumentCategory,
  DbDocument,
};
