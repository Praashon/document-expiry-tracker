import { NextRequest, NextResponse } from "next/server";
import {
  SYSTEM_PROMPT,
  SCOPE_CHECK_PROMPT,
  OUT_OF_SCOPE_RESPONSE,
} from "@/lib/knowledge-base";
import { callOpenRouter, Message } from "@/lib/ai-service";

async function checkScope(userMessage: string): Promise<boolean> {
  try {
    const response = await callOpenRouter(
      [
        {
          role: "user",
          content: SCOPE_CHECK_PROMPT + userMessage,
        },
      ],
      10
    );

    return response.trim().toUpperCase().includes("IN_SCOPE");
  } catch (error) {
    console.error("Scope check error:", error);
    // If scope check fails, default to allowing the question
    return true;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Check if the message is in scope
    const isInScope = await checkScope(message);

    if (!isInScope) {
      return NextResponse.json({
        response: OUT_OF_SCOPE_RESPONSE,
        isOutOfScope: true,
      });
    }

    // Build the conversation with system prompt
    const messages: Message[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...conversationHistory
        .slice(-10)
        .map((msg: { role: string; content: string }) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
      {
        role: "user",
        content: message,
      },
    ];

    // Get response from OpenRouter (Mistral Small 3.1 24B)
    const response = await callOpenRouter(messages);

    return NextResponse.json({
      response: response,
      isOutOfScope: false,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    if (
      error instanceof Error &&
      error.message.includes("OPENROUTER_API_KEY")
    ) {
      return NextResponse.json(
        { error: "AI assistant is not configured. Please set up the API key." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process your message. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Health check endpoint
  const hasApiKey = !!process.env.OPENROUTER_API_KEY;

  return NextResponse.json({
    status: hasApiKey ? "ready" : "not_configured",
    message: hasApiKey
      ? "DocTracker AI Assistant is ready"
      : "OPENROUTER_API_KEY is not configured",
  });
}
