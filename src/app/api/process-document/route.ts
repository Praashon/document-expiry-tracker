import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/ai-service";

const SYSTEM_PROMPT = `You are an expert document parser. Your job is to extract ALL structured information from the raw OCR text of a document.
Please ignore any noise or garbage characters from the OCR.

Return a JSON object with the following fields:

**CRITICAL FIELDS (extract these with highest priority):**
- name: The full name of the document holder (REQUIRED - look for labels like "Name", "Full Name", "नाम", or the most prominent name on the document)
- issue_date: The date the document was issued in YYYY-MM-DD format (look for: "Date of Issue", "Issue Date", "Issued On", "DOI", "जारी मिति", or the earlier date on the document)
- expiration_date: The expiration/validity end date in YYYY-MM-DD format (look for: "Date of Expiry", "Valid Until", "Valid Through", "Expires On", "Expiry Date", "म्याद", "मान्य मिति सम्म", or the later date on the document)
- title: A short, descriptive title for the document (e.g., "Driving License", "Passport", "Rent Agreement")
- type: The most likely document type (one of: "Rent Agreement", "Insurance", "Subscription", "License", "Warranty", "Contract", "Citizenship", "PAN Card", "National ID", "Passport", "Driving License", "Voter ID", "Birth Certificate", "Other")

**DATE EXTRACTION HINTS:**
- If you see two dates, the EARLIER one is typically the issue_date and the LATER one is typically the expiration_date
- Look for date labels in close proximity to the date values
- Common issue date labels: "Issue Date", "DOI", "Date of Issue", "Issued", "जारी मिति"
- Common expiry date labels: "Expiry", "Valid Until", "Expires", "Valid Through", "Valid Thru", "DOE", "म्याद"

**FRONT/BACK DOCUMENT HANDLING:**
- If the text contains "--- FRONT SIDE ---" and "--- BACK SIDE ---" markers, extract data from BOTH sections
- Combine information from both sides to build a complete profile

- metadata: A nested object containing ALL other specific details found:

    **Personal Information:**
    - date_of_birth: in YYYY-MM-DD format
    - place_of_birth: City/District of birth
    - gender / sex: Male, Female, Other
    - nationality: Country of citizenship
    - blood_group: e.g. A+, O-, B+, AB-
    - height: e.g. "5'8" or "175 cm"
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

IMPORTANT: 
1. The name, issue_date, and expiration_date fields are TOP PRIORITY. Always try to extract these even if the labels are unclear.
2. Extract EVERY piece of text/data you can identify. Do not skip any fields.
3. Do not invent information. If a field is not found, omit it or set to null.
4. Ensure the response is valid JSON.`;

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
