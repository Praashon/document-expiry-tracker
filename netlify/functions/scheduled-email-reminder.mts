import type { Config } from "@netlify/functions";

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export default async (req: Request) => {
  try {
    const notificationUrl = `${APP_URL}/api/notifications?trigger=cron`;

    const response = await fetch(notificationUrl, {
      method: "GET",
      headers: {
        "x-cron-secret": CRON_SECRET || "",
      },
    });

    if (!response.ok) {
      console.error(`Notification API error: ${response.status}`);
      return new Response(
        JSON.stringify({
          error: "Failed to trigger notifications",
          status: response.status,
        }),
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Email reminders sent successfully:", data);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email reminders triggered",
        data,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in scheduled function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};

export const config: Config = {
  schedule: "15 23 * * *",
};
