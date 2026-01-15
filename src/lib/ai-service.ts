export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export async function callOpenRouter(
  messages: Message[],
  maxTokens: number = 1024,
  temperature: number = 0.7,
  jsonMode: boolean = false
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  const body: any = {
    model: "mistralai/devstral-2512:free",
    messages,
    max_tokens: maxTokens,
    temperature: temperature,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "DocTracker",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenRouter API error:", {
      status: response.status,
      statusText: response.statusText,
      error: error,
      headers: Object.fromEntries(response.headers.entries())
    });
    throw new Error(`OpenRouter API error (${response.status}): ${error}`);
  }

  const data: OpenRouterResponse = await response.json();
  return data.choices[0]?.message?.content || "";
}
