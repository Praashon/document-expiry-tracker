import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { DocumentType } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: document, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Error fetching document" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existingDoc, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingDoc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const formData = await req.formData();

    const title = formData.get("title") as string;
    const type = formData.get("type") as DocumentType;
    const expirationDate = formData.get("expiration_date") as string;
    const reminderDate = formData.get("reminder_date") as string | null;
    const notes = formData.get("notes") as string | null;
    const file = formData.get("file") as File | null;
    const removeFile = formData.get("remove_file") === "true";

    if (!title || !type || !expirationDate) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: title, type, and expiration_date are required",
        },
        { status: 400 },
      );
    }

    if (title.length > 255) {
      return NextResponse.json(
        { error: "Title must be less than 255 characters" },
        { status: 400 },
      );
    }

    const validTypes = [
      "Rent",
      "Insurance",
      "Subscription",
      "License",
      "Other",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 },
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(expirationDate)) {
      return NextResponse.json(
        { error: "Invalid expiration date format" },
        { status: 400 },
      );
    }

    let filePath = existingDoc.file_path;
    let fileName = existingDoc.file_name;
    let fileType = existingDoc.file_type;
    let fileSize = existingDoc.file_size;

    if (removeFile && existingDoc.file_path) {
      const { error: deleteError } = await supabase.storage
        .from("documents")
        .remove([existingDoc.file_path]);

      if (deleteError) {
        console.warn("Could not delete old file:", deleteError);
      }

      filePath = null;
      fileName = null;
      fileType = null;
      fileSize = null;
    }

    if (file && file.size > 0) {
      if (existingDoc.file_path) {
        const { error: deleteError } = await supabase.storage
          .from("documents")
          .remove([existingDoc.file_path]);

        if (deleteError) {
          console.warn("Could not delete old file:", deleteError);
        }
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File size must be less than 10MB" },
          { status: 400 },
        );
      }

      const fileExt = file.name.split(".").pop();
      const uploadFileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(uploadFileName, file);

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        return NextResponse.json(
          { error: "Error uploading file" },
          { status: 500 },
        );
      }

      filePath = uploadData.path;
      fileName = file.name;
      fileType = file.type;
      fileSize = file.size;
    }

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
        { status: 500 },
      );
    }

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Error updating document" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    if (document.file_path) {
      const { error: deleteFileError } = await supabase.storage
        .from("documents")
        .remove([document.file_path]);

      if (deleteFileError) {
        console.warn("Could not delete file:", deleteFileError);
      }
    }

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting document:", deleteError);
      return NextResponse.json(
        { error: "Error deleting document" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Error deleting document" },
      { status: 500 },
    );
  }
}
