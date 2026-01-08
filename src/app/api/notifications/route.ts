import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

// Initialize Nodemailer transporter lazily
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error(
        "GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required",
      );
    }
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

// Initialize Supabase admin client lazily
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error("Supabase environment variables are not set");
    }
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }
  return supabaseAdmin;
}

interface Document {
  id: string;
  name: string;
  doc_type: string;
  expiry_date: string;
  user_id: string;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
  notificationsEnabled: boolean;
}

// Notification intervals in days
const NOTIFICATION_INTERVALS = [30, 15, 7, 1];

// POST - Send automatic expiration notifications (called by cron job daily)
export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized (optional - for cron jobs)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Allow requests without auth in development, require in production
    if (
      cronSecret &&
      process.env.NODE_ENV === "production" &&
      authHeader !== `Bearer ${cronSecret}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    // Calculate target dates for each notification interval
    const targetDates = NOTIFICATION_INTERVALS.map((days) => {
      const date = new Date(now);
      date.setDate(date.getDate() + days);
      return {
        days,
        date: date.toISOString().split("T")[0],
      };
    });

    console.log(
      "Checking for documents expiring on:",
      targetDates.map((t) => `${t.days} days: ${t.date}`),
    );

    // Fetch all documents expiring on any of the target dates
    const dateStrings = targetDates.map((t) => t.date);

    const { data: expiringDocuments, error: docsError } = (await supabase
      .from("documents")
      .select("id, name, doc_type, expiry_date, user_id")
      .in("expiry_date", dateStrings)) as {
      data: Document[] | null;
      error: Error | null;
    };

    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 },
      );
    }

    if (!expiringDocuments || expiringDocuments.length === 0) {
      return NextResponse.json({
        message: "No documents expiring on notification dates",
        sent: 0,
        checked: dateStrings,
      });
    }

    console.log(`Found ${expiringDocuments.length} documents to notify about`);

    // Get unique user IDs
    const userIds = [...new Set(expiringDocuments.map((doc) => doc.user_id))];

    // Fetch user details and cache them
    const userCache: Map<string, UserInfo> = new Map();

    for (const userId of userIds) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.admin.getUserById(userId);

      if (userError || !user?.email) {
        console.error(`Error fetching user ${userId}:`, userError);
        continue;
      }

      userCache.set(userId, {
        id: userId,
        email: user.email,
        name:
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          user.email.split("@")[0],
        notificationsEnabled: user.user_metadata?.email_notifications !== false,
      });
    }

    // Send individual notifications for each document
    let sentCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const mailTransporter = getTransporter();

    for (const doc of expiringDocuments) {
      const userInfo = userCache.get(doc.user_id);

      if (!userInfo) {
        console.log(`User not found for document ${doc.id}`);
        skippedCount++;
        continue;
      }

      if (!userInfo.notificationsEnabled) {
        console.log(`Notifications disabled for user ${userInfo.email}`);
        skippedCount++;
        continue;
      }

      // Calculate days until expiry
      const expiryDate = new Date(doc.expiry_date);
      const daysUntil = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Generate email
      const emailHtml = generateReminderEmail(
        userInfo.name,
        doc.name,
        doc.doc_type,
        doc.expiry_date,
        daysUntil,
      );

      const subject = getSubjectLine(doc.name, daysUntil);

      try {
        await mailTransporter.sendMail({
          from: `DocTracker <${process.env.GMAIL_USER}>`,
          to: userInfo.email,
          subject: subject,
          html: emailHtml,
        });

        console.log(
          `✓ Sent ${daysUntil}-day reminder to ${userInfo.email} for "${doc.name}"`,
        );
        sentCount++;
      } catch (err) {
        const errorMsg = `Failed to send to ${userInfo.email}: ${err instanceof Error ? err.message : "Unknown error"}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return NextResponse.json({
      message: "Notification job completed",
      sent: sentCount,
      skipped: skippedCount,
      total: expiringDocuments.length,
      checkedDates: dateStrings,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Notification error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET - Check notification status for a user or test the system
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const test = searchParams.get("test");

  // Test endpoint to verify email configuration
  if (test === "true") {
    try {
      const mailTransporter = getTransporter();
      await mailTransporter.verify();
      return NextResponse.json({
        status: "ok",
        message: "Email configuration is valid",
        intervals: NOTIFICATION_INTERVALS,
      });
    } catch (error) {
      return NextResponse.json(
        {
          status: "error",
          message: "Email configuration failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }

  if (!userId) {
    return NextResponse.json(
      {
        error: "User ID is required. Use ?userId=xxx or ?test=true",
        intervals: NOTIFICATION_INTERVALS,
      },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date();

    // Get all upcoming expiring documents for the user (next 60 days)
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const { data: documents, error } = (await supabase
      .from("documents")
      .select("id, name, doc_type, expiry_date")
      .eq("user_id", userId)
      .gte("expiry_date", now.toISOString().split("T")[0])
      .lte("expiry_date", sixtyDaysFromNow.toISOString().split("T")[0])
      .order("expiry_date", { ascending: true })) as {
      data: Document[] | null;
      error: Error | null;
    };

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 },
      );
    }

    // Calculate when each document will receive notifications
    const documentsWithNotifications = documents?.map((doc) => {
      const expiryDate = new Date(doc.expiry_date);
      const daysUntil = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const upcomingNotifications = NOTIFICATION_INTERVALS.filter(
        (interval) => interval <= daysUntil,
      ).map((interval) => {
        const notifyDate = new Date(expiryDate);
        notifyDate.setDate(notifyDate.getDate() - interval);
        return {
          daysBeforeExpiry: interval,
          notificationDate: notifyDate.toISOString().split("T")[0],
          alreadySent: interval > daysUntil,
        };
      });

      return {
        ...doc,
        daysUntilExpiry: daysUntil,
        upcomingNotifications,
      };
    });

    return NextResponse.json({
      userId,
      expiringCount: documents?.length || 0,
      notificationIntervals: NOTIFICATION_INTERVALS,
      documents: documentsWithNotifications || [],
    });
  } catch (error) {
    console.error("Error checking notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT - Send a test notification to verify email setup
export async function PUT(request: NextRequest) {
  try {
    const { email, testMode } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const mailTransporter = getTransporter();

    // Send a test email
    const testHtml = generateTestEmail(email);

    await mailTransporter.sendMail({
      from: `DocTracker <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "✅ DocTracker Email Notifications Activated",
      html: testHtml,
    });

    return NextResponse.json({
      message: "Test email sent successfully",
      sentTo: email,
      notificationSchedule: NOTIFICATION_INTERVALS.map(
        (d) => `${d} day${d > 1 ? "s" : ""} before expiry`,
      ),
    });
  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json(
      {
        error: "Failed to send test notification",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function getSubjectLine(documentName: string, daysUntil: number): string {
  if (daysUntil <= 1) {
    return `🚨 URGENT: ${documentName} expires tomorrow!`;
  } else if (daysUntil <= 7) {
    return `⚠️ ${documentName} expires in ${daysUntil} days`;
  } else if (daysUntil <= 15) {
    return `📋 Reminder: ${documentName} expires in ${daysUntil} days`;
  } else {
    return `📅 Advance Notice: ${documentName} expires in ${daysUntil} days`;
  }
}

function getUrgencyConfig(daysUntil: number): {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  urgencyText: string;
} {
  if (daysUntil <= 1) {
    return {
      color: "#DC2626",
      bgColor: "#FEF2F2",
      borderColor: "#DC2626",
      icon: "🚨",
      urgencyText: "EXPIRES TOMORROW",
    };
  } else if (daysUntil <= 7) {
    return {
      color: "#EA580C",
      bgColor: "#FFF7ED",
      borderColor: "#EA580C",
      icon: "⚠️",
      urgencyText: "EXPIRING SOON",
    };
  } else if (daysUntil <= 15) {
    return {
      color: "#CA8A04",
      bgColor: "#FEFCE8",
      borderColor: "#CA8A04",
      icon: "📋",
      urgencyText: "REMINDER",
    };
  } else {
    return {
      color: "#0284C7",
      bgColor: "#F0F9FF",
      borderColor: "#0284C7",
      icon: "📅",
      urgencyText: "ADVANCE NOTICE",
    };
  }
}

function generateTestEmail(userEmail: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #A8BBA3 0%, #8FA58F 100%); padding: 40px; text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                  <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">Email Notifications Activated!</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Great news! Your DocTracker email notifications are now working perfectly.
                  </p>

                  <div style="background-color: #F0FDF4; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <h3 style="margin: 0 0 16px 0; color: #166534; font-size: 16px;">📬 You will receive reminders:</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #15803D;">
                      <li style="margin-bottom: 8px;"><strong>30 days</strong> before expiry (Advance Notice)</li>
                      <li style="margin-bottom: 8px;"><strong>15 days</strong> before expiry (Reminder)</li>
                      <li style="margin-bottom: 8px;"><strong>7 days</strong> before expiry (Warning)</li>
                      <li style="margin-bottom: 0;"><strong>1 day</strong> before expiry (Urgent Alert)</li>
                    </ul>
                  </div>

                  <p style="margin: 0 0 24px 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                    You'll automatically receive email reminders for all your documents with expiration dates. Never miss a renewal deadline again!
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard"
                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #A8BBA3 0%, #8FA58F 100%); color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          Go to Dashboard
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 40px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB; text-align: center;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    This email was sent to ${userEmail}<br>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/profile?tab=settings" style="color: #6B7280;">Manage preferences</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function generateReminderEmail(
  userName: string,
  documentName: string,
  documentType: string,
  expiryDate: string,
  daysUntil: number,
): string {
  const config = getUrgencyConfig(daysUntil);

  const formattedDate = new Date(expiryDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const daysText =
    daysUntil === 0
      ? "TODAY"
      : daysUntil === 1
        ? "TOMORROW"
        : `in ${daysUntil} days`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #A8BBA3 0%, #8FA58F 100%); padding: 32px; text-align: center;">
                  <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 700;">DocTracker</h1>
                  <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Document Expiration Alert</p>
                </td>
              </tr>

              <!-- Urgency Banner -->
              <tr>
                <td style="background-color: ${config.bgColor}; padding: 16px 32px; border-bottom: 3px solid ${config.borderColor};">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align: center;">
                        <span style="font-size: 24px;">${config.icon}</span>
                        <span style="color: ${config.color}; font-weight: 700; font-size: 14px; letter-spacing: 1px; margin-left: 8px; vertical-align: middle;">
                          ${config.urgencyText}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 32px;">
                  <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Hi ${userName},
                  </p>

                  <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    This is a reminder that one of your documents is expiring soon:
                  </p>

                  <!-- Document Card -->
                  <div style="background-color: #F9FAFB; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #E5E7EB;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 20px; font-weight: 600;">
                            ${documentName}
                          </h2>
                          <p style="margin: 0 0 16px 0; color: #6B7280; font-size: 14px;">
                            ${documentType}
                          </p>
                          <div style="display: inline-block; background-color: ${config.bgColor}; border-radius: 8px; padding: 12px 16px;">
                            <p style="margin: 0; color: ${config.color}; font-size: 14px;">
                              <strong>Expires ${daysText}</strong>
                            </p>
                            <p style="margin: 4px 0 0 0; color: ${config.color}; font-size: 12px;">
                              ${formattedDate}
                            </p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Action Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 8px 0 24px 0;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard"
                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #A8BBA3 0%, #8FA58F 100%); color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          View Document
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; text-align: center;">
                    Take action now to renew or update your document before it expires.
                  </p>
                </td>
              </tr>

              <!-- Next Reminder Info -->
              ${
                daysUntil > 1
                  ? `
              <tr>
                <td style="padding: 0 32px 24px 32px;">
                  <div style="background-color: #F0F9FF; border-radius: 8px; padding: 16px; text-align: center;">
                    <p style="margin: 0; color: #0369A1; font-size: 13px;">
                      📬 Next reminder: ${getNextReminderText(daysUntil)}
                    </p>
                  </div>
                </td>
              </tr>
              `
                  : ""
              }

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB;">
                  <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 12px; text-align: center;">
                    You're receiving this because you have document expiration notifications enabled.
                  </p>
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px; text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/profile?tab=settings"
                       style="color: #6B7280; text-decoration: underline;">
                      Manage notification preferences
                    </a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function getNextReminderText(currentDaysUntil: number): string {
  const nextIntervals = NOTIFICATION_INTERVALS.filter(
    (interval) => interval < currentDaysUntil,
  );

  if (nextIntervals.length === 0) {
    return "This is your final reminder";
  }

  const nextInterval = nextIntervals[0];
  if (nextInterval === 1) {
    return "1 day before expiry (final reminder)";
  } else if (nextInterval === 7) {
    return "7 days before expiry";
  } else if (nextInterval === 15) {
    return "15 days before expiry";
  }

  return `${nextInterval} days before expiry`;
}
