import { NextRequest, NextResponse } from "next/server";
import { createDocument, uploadFile } from "@/lib/document-actions";
import { supabase } from "@/lib/supabase";
import type { DocumentType } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const formData = await req.formData();

    // Extract form fields
    const title = formData.get("title") as string;
    const type = formData.get("type") as DocumentType;
    const expirationDate = formData.get("expiration_date") as string;
    const reminderDate = formData.get("reminder_date") as string | null;
    const notes = formData.get("notes") as string | null;
    const file = formData.get("file") as File | null;
    // Validate required fields
    if (!title || !type || !expirationDate) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: title, type, and expiration_date are required",
        },
        { status: 400 },
      );
    }

    let filePath: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;
    let fileSize: number | null = null;

    // Upload file if provided
    if (file && file.size > 0) {
      const uploadedFile = await uploadFile(file, userId);
      filePath = uploadedFile.path;
      fileName = file.name;
      fileType = file.type;
      fileSize = file.size;
    }

    // Create document in database
    const newDocument = await createDocument({
      title,
      type,
      expiration_date: expirationDate,
      reminder_date: reminderDate || null,
      notes: notes || null,
      file_path: filePath,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      user_id: userId,
    });

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Error creating document" },
      { status: 500 },
    );
  }
}

export async function GET(_req: NextRequest) {
  try {
    // Get the current user
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
        { status: 500 },
      );
    }

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Error fetching documents" },
      { status: 500 },
    );
  }
}
