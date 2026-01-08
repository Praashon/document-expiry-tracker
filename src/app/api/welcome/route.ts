import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

// POST - Send welcome email to new user
export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const userName = name || email.split("@")[0];

    const success = await sendWelcomeEmail(email, userName);

    if (success) {
      return NextResponse.json({
        message: "Welcome email sent successfully",
        sentTo: email,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to send welcome email" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
