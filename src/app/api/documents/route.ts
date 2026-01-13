import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { DocumentType } from "@/lib/supabase";
import { DOCUMENT_TYPE_CONFIG } from "@/lib/supabase";

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

    const userId = user.id;
    const formData = await req.formData();

    const title = formData.get("title") as string;
    const type = formData.get("type") as DocumentType;
    const expirationDate = formData.get("expiration_date") as string | null;
    const reminderDate = formData.get("reminder_date") as string | null;
    const notes = formData.get("notes") as string | null;
    const file = formData.get("file") as File | null;
    const documentNumber = formData.get("document_number") as string | null;
    const issueDate = formData.get("issue_date") as string | null;
    const issuingAuthority = formData.get("issuing_authority") as string | null;
    const metadataRaw = formData.get("metadata") as string | null;

    let metadata = {};
    if (metadataRaw) {
      try {
        metadata = JSON.parse(metadataRaw);
      } catch (e) {
        console.error("Failed to parse metadata:", e);
      }
    }

    if (!title || !type) {
      return NextResponse.json(
        { error: "Missing required fields: title and type are required" },
        { status: 400 }
      );
    }

    // Get the category from the document type config
    const typeConfig = DOCUMENT_TYPE_CONFIG[type];
    const category = typeConfig?.category || "other";

    // Check if expiration date is required for this document type
    if (typeConfig?.hasExpiry && !expirationDate) {
      return NextResponse.json(
        { error: "Expiration date is required for this document type" },
        { status: 400 }
      );
    }

    let filePath: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;
    let fileSize: number | null = null;

    if (file && file.size > 0) {
      const fileExt = file.name.split(".").pop();
      const uploadFileName = `${userId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(uploadFileName, file);

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        return NextResponse.json(
          { error: "Error uploading file" },
          { status: 500 }
        );
      }

      filePath = uploadData.path;
      fileName = file.name;
      fileType = file.type;
      fileSize = file.size;
    }

    const docData = {
      title: title.trim(),
      type,
      category,
      expiration_date: expirationDate || null,
      reminder_date: reminderDate || null,
      notes: notes?.trim() || null,
      file_path: filePath,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      document_number: documentNumber?.trim() || null,
      issue_date: issueDate || null,
      issuing_authority: issuingAuthority?.trim() || null,
      user_id: userId,
    };

    let { data: newDocument, error: insertError } = await supabase
      .from("documents")
      .insert({ ...docData, metadata })
      .select()
      .single();

    // Fallback: If insert failed (likely metadata), retry without it
    if (insertError) {
      console.warn(
        "Initial insert failed, retrying without metadata. Error:",
        insertError.message
      );
      const retryResult = await supabase
        .from("documents")
        .insert(docData)
        .select()
        .single();

      if (!retryResult.error) {
        newDocument = retryResult.data;
        insertError = null;
      }
    }

    if (insertError) {
      console.error("Error creating document:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Error creating document" },
        { status: 500 }
      );
    }

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Error creating document" },
      { status: 500 }
    );
  }
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: documents, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      return NextResponse.json(
        { error: "Error fetching documents" },
        { status: 500 }
      );
    }

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Error fetching documents" },
      { status: 500 }
    );
  }
}
