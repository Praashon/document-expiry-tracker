import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadFile, deleteFile } from "@/lib/document-actions";
import type { DocumentType } from "@/lib/supabase";

// GET - Fetch a single document by ID
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the document
    const { data: document, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id) // Ensure user owns this document
      .single();

    if (error || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Error fetching document" },
      { status: 500 }
    );
  }
}

// PUT - Update a document
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, verify the document exists and belongs to the user
    const { data: existingDoc, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const formData = await req.formData();

    // Extract form fields
    const title = formData.get("title") as string;
    const type = formData.get("type") as DocumentType;
    const expirationDate = formData.get("expiration_date") as string;
    const reminderDate = formData.get("reminder_date") as string | null;
    const notes = formData.get("notes") as string | null;
    const file = formData.get("file") as File | null;
    const removeFile = formData.get("remove_file") === "true";

    // Validate required fields
    if (!title || !type || !expirationDate) {
      return NextResponse.json(
        {
          error: "Missing required fields: title, type, and expiration_date are required",
        },
        { status: 400 }
      );
    }

    // Validate title length
    if (title.length > 255) {
      return NextResponse.json(
        { error: "Title must be less than 255 characters" },
        { status: 400 }
      );
    }

    // Validate document type
    const validTypes = ["Rent", "Insurance", "Subscription", "License", "Other"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 }
      );
    }

    // Validate expiration date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(expirationDate)) {
      return NextResponse.json(
        { error: "Invalid expiration date format" },
        { status: 400 }
      );
    }

    let filePath = existingDoc.file_path;
    let fileName = existingDoc.file_name;
    let fileType = existingDoc.file_type;
    let fileSize = existingDoc.file_size;

    // Handle file removal
    if (removeFile && existingDoc.file_path) {
      try {
        await deleteFile(existingDoc.file_path);
      } catch (fileError) {
        console.warn("Could not delete old file:", fileError);
      }
      filePath = null;
      fileName = null;
      fileType = null;
      fileSize = null;
    }

    // Handle new file upload
    if (file && file.size > 0) {
      // Delete old file if exists
      if (existingDoc.file_path) {
        try {
          await deleteFile(existingDoc.file_path);
        } catch (fileError) {
          console.warn("Could not delete old file:", fileError);
        }
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File size must be less than 10MB" },
          { status: 400 }
        );
      }

      const uploadedFile = await uploadFile(file, user.id);
      filePath = uploadedFile.path;
      fileName = file.name;
      fileType = file.type;
      fileSize = file.size;
    }

    // Update document in database
    const { data: updatedDocument, error: updateError } = await supabase
      .from("documents")
      .update({
        title: title.trim(),
        type,
        expiration_date: expirationDate,
        reminder_date: reminderDate || null,
        notes: notes?.trim() || null,
        file_path: filePath,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating document:", updateError);
      return NextResponse.json(
        { error: "Error updating document" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Error updating document" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a document
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, fetch the document to get file path and verify ownership
    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete the file from storage if it exists
    if (document.file_path) {
      try {
        await deleteFile(document.file_path);
      } catch (fileError) {
        console.warn("Could not delete file:", fileError);
        // Continue with document deletion even if file deletion fails
      }
    }

    // Delete the document from the database
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting document:", deleteError);
      return NextResponse.json(
        { error: "Error deleting document" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Error deleting document" },
      { status: 500 }
    );
  }
}
