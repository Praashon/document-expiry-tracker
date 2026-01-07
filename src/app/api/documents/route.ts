import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { DocumentType } from "@/lib/supabase";

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
    const expirationDate = formData.get("expiration_date") as string;
    const reminderDate = formData.get("reminder_date") as string | null;
    const notes = formData.get("notes") as string | null;
    const file = formData.get("file") as File | null;

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
          { status: 500 },
        );
      }

      filePath = uploadData.path;
      fileName = file.name;
      fileType = file.type;
      fileSize = file.size;
    }

    const { data: newDocument, error: insertError } = await supabase
      .from("documents")
      .insert({
        title: title.trim(),
        type,
        expiration_date: expirationDate,
        reminder_date: reminderDate || null,
        notes: notes?.trim() || null,
        file_path: filePath,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        user_id: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating document:", insertError);
      return NextResponse.json(
        { error: "Error creating document" },
        { status: 500 },
      );
    }

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
