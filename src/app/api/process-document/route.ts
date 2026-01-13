import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/ai-service";

const SYSTEM_PROMPT = `You are an expert document parser. Your job is to extract ALL structured information from the raw OCR text of a document.
Please ignore any noise or garbage characters from the OCR.

Return a JSON object with the following fields (if found):
- title: A short, descriptive title for the document (e.g., "Driving License", "Passport", "Rent Agreement").
- type: The most likely document type (one of: "Rent Agreement", "Insurance", "Subscription", "License", "Warranty", "Contract", "Citizenship", "PAN Card", "National ID", "Passport", "Driving License", "Voter ID", "Birth Certificate", "Other").
- expiration_date: The expiration date in YYYY-MM-DD format (or null if not found/no expiry).
- metadata: A nested object containing ALL other specific details found. Extract EVERY piece of information visible on the document, including but not limited to:

    **Personal Information:**
    - name / full_name: The full name of the person
    - date_of_birth: in YYYY-MM-DD format
    - place_of_birth: City/District of birth
    - gender / sex: Male, Female, Other
    - nationality: Country of citizenship
    - blood_group: e.g. A+, O-, B+, AB-
    - height: e.g. "5'8\"" or "175 cm"
    - eye_color: e.g. Brown, Blue, Black
    - hair_color: e.g. Black, Brown, Blonde
    - complexion: e.g. Fair, Medium, Dark
    - distinguishing_marks: Any visible marks or features

    **Family Information:**
    - father_name
    - mother_name
    - spouse_name
    - grand_father_name

    **Address Information:**
    - address: Full address
    - permanent_address: Permanent/home address
    - temporary_address: Current/temporary address
    - district
    - municipality / vdc
    - ward_no
    - city
    - state / province
    - country
    - postal_code / zip_code

    **Document Information:**
    - document_number: Any ID number (passport number, license number, etc.)
    - issue_date: in YYYY-MM-DD format
    - issuing_authority: e.g. "Department of Transport"
    - issue_place: Where the document was issued
    - citizenship_number
    - license_class / category: e.g. "A", "B", "C" for driving license
    - vehicle_class: Types of vehicles allowed
    - registration_number
    - policy_number: For insurance documents

    **Other Fields:**
    - occupation / profession
    - employer
    - emergency_contact
    - phone_number
    - email
    - any_other_field_found: Include ANY other information visible on the document

IMPORTANT: Extract EVERY piece of text/data you can identify from the document. Do not skip any fields. The goal is to capture all information for future reference.

Do not invent information. If a field is not found, simply omit it from the metadata.
Ensure the response is valid JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const prompt = `Here is the raw OCR text from a document. Please extract the structured details:\n\n${text}`;

    const response = await callOpenRouter(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      1024,
      0.2, // Low temperature for consistent extraction
      true, // Enable JSON mode
    );

    // Clean up potential markdown code blocks if the model adds them
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith("```json")) {
      cleanResponse = cleanResponse
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (cleanResponse.startsWith("```")) {
      cleanResponse = cleanResponse
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
    }

    let parsedData;
    try {
      parsedData = JSON.parse(cleanResponse);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", cleanResponse);
      return NextResponse.json(
        { error: "Failed to parse document data" },
        { status: 500 },
      );
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("Error processing document:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 },
    );
  }
}
