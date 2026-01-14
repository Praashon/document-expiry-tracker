import nodemailer from "nodemailer";

// Initialize Nodemailer transporter lazily
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error(
        "GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required"
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

export async function sendExpiryReminderEmail(
  email: string,
  name: string,
  documentName: string,
  documentType: string,
  expiryDate: string,
  daysUntil: number
): Promise<boolean> {
  try {
    const mailTransporter = getTransporter();

    const html = generateReminderEmailHtml(
      name,
      documentName,
      documentType,
      expiryDate,
      daysUntil
    );

    const subject = getSubjectLine(documentName, daysUntil);

    await mailTransporter.sendMail({
      from: `DocTracker <${process.env.GMAIL_USER}>`,
      to: email,
      subject: subject,
      html: html,
    });

    return true;
  } catch (error) {
    console.error(`Failed to send reminder email to ${email}:`, error);
    return false;
  }
}

export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const mailTransporter = getTransporter();
    await mailTransporter.verify();
    return true;
  } catch (error) {
    console.error("Email configuration verification failed:", error);
    return false;
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

function generateReminderEmailHtml(
  userName: string,
  documentName: string,
  documentType: string,
  expiryDate: string,
  daysUntil: number
): string {
  const config = getUrgencyConfig(daysUntil);

  // Dynamic URL for different deployment environments
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined ||
        process.env.URL || // Netlify
        "http://localhost:3000"; // Development fallback

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
                  <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Hi ${userName},
                  </p>

                  <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    This is a reminder that one of your documents is expiring soon:
                  </p>

                  <!-- Document Card -->
                  <div style="background-color: #F9FAFB; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #E5E7EB;">
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
                  </div>

                  <!-- Action Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 8px 0 24px 0;">
                        <a href="${appUrl}/dashboard"
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

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB;">
                  <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 12px; text-align: center;">
                    You're receiving this because you have document expiration notifications enabled.
                  </p>
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px; text-align: center;">
                    <a href="${appUrl}/dashboard/profile?tab=settings"
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
