import { supabase, Document, DocumentStatus, DocumentType } from "./supabase";

// Interface for documents returned from database
interface DbDocument {
  id: string;
  title: string;
  type: string;
  expiration_date: string | null;
  reminder_date: string | null;
  notes: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Helper function to determine document status
export function getDocumentStatus(expirationDate: string): DocumentStatus {
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

// Helper function to calculate days until expiration
export function getDaysUntilExpiration(expirationDate: string): number {
  const now = new Date();
  const expDate = new Date(expirationDate);
  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Upload a file to Supabase Storage
export async function uploadFile(file: File, userId: string) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("documents")
    .upload(fileName, file);

  if (error) {
    console.error("Error uploading file:", error);
    throw error;
  }

  return data;
}

// Get file public URL
export function getFileUrl(filePath: string): string {
  const { data } = supabase.storage.from("documents").getPublicUrl(filePath);
  return data.publicUrl;
}

// Get file download URL
export async function getFileDownloadUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) {
    console.error("Error getting download URL:", error);
    throw error;
  }

  return data.signedUrl;
}

// Delete a file from storage
export async function deleteFile(filePath: string) {
  const { error } = await supabase.storage.from("documents").remove([filePath]);

  if (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}

// Create a new document entry
export async function createDocument(
  data: Omit<Document, "id" | "created_at" | "updated_at">,
) {
  const { data: document, error } = await supabase
    .from("documents")
    .insert({
      title: data.title,
      type: data.type,
      expiration_date: data.expiration_date,
      reminder_date: data.reminder_date || null,
      notes: data.notes || null,
      file_path: data.file_path || null,
      file_name: data.file_name || null,
      file_type: data.file_type || null,
      file_size: data.file_size || null,
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

// Get all documents for a user
export async function getDocuments(userId: string) {
  const { data, error } = await supabase
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

// Get a single document by ID
export async function getDocument(documentId: string) {
  const { data, error } = await supabase
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

// Update a document
export async function updateDocument(
  documentId: string,
  data: Partial<Omit<Document, "id" | "user_id" | "created_at" | "updated_at">>,
) {
  const { data: document, error } = await supabase
    .from("documents")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .select()
    .single();

  if (error) {
    console.error("Error updating document:", error);
    throw error;
  }

  return document;
}

// Delete a document and its associated file
export async function deleteDocument(documentId: string, filePath?: string) {
  // Delete the file from storage if it exists
  if (filePath) {
    try {
      await deleteFile(filePath);
    } catch (fileError) {
      console.warn("Could not delete file:", fileError);
      // Continue with document deletion even if file deletion fails
    }
  }

  // Delete the document from the database
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
}

// Get documents by status
export async function getDocumentsByStatus(
  userId: string,
  status: DocumentStatus,
) {
  const documents = await getDocuments(userId);
  return documents.filter((doc: DbDocument) => {
    if (!doc.expiration_date) return false;
    return getDocumentStatus(doc.expiration_date) === status;
  });
}

// Get document statistics for a user
export async function getDocumentStats(userId: string) {
  const documents = await getDocuments(userId);

  const total = documents.length;
  let valid = 0;
  let expiringSoon = 0;
  let expired = 0;

  documents.forEach((doc: DbDocument) => {
    if (doc.expiration_date) {
      const status = getDocumentStatus(doc.expiration_date);
      if (status === "valid") valid++;
      else if (status === "expiring_soon") expiringSoon++;
      else if (status === "expired") expired++;
    }
  });

  return {
    total,
    valid,
    expiringSoon,
    expired,
  };
}

// Get documents expiring within a specific number of days
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

// Search documents by title
export async function searchDocuments(userId: string, searchTerm: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .or(`title.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error searching documents:", error);
    return [];
  }

  return data || [];
}

// Get documents by type
export async function getDocumentsByType(userId: string, type: DocumentType) {
  const { data, error } = await supabase
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

// Re-export types for convenience
export type { Document, DocumentType, DocumentStatus, DbDocument };
