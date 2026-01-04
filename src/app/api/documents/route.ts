import { NextRequest, NextResponse } from "next/server";
import { account } from "@/lib/appwrite";
import { addDocument, uploadFile } from "@/lib/document-actions";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file found" }, { status: 400 });
    }

    const user = await account.get();
    const userId = user.$id;

    const uploadedFile = await uploadFile(file);
    const newDocument = await addDocument(
      uploadedFile.$id,
      userId,
      file.name,
      file.type,
      file.size
    );

    return NextResponse.json(newDocument);
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Error uploading document" },
      { status: 500 }
    );
  }
}
