import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    codes.push(code);
  }
  return codes;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, code } = await request.json();

    if (action === "generate") {
      const secret = authenticator.generateSecret();
      const appName = "DocTracker";
      const accountName = user.email || "user";

      const otpauthUrl = authenticator.keyuri(accountName, appName, secret);
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      await supabase.auth.updateUser({
        data: {
          totp_temp_secret: secret,
        },
      });

      return NextResponse.json({
        success: true,
        qrCode: qrCodeDataUrl,
        secret: secret,
      });
    }

    if (action === "verify") {
      if (!code || code.length !== 6) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 },
        );
      }

      const tempSecret = user.user_metadata?.totp_temp_secret;

      if (!tempSecret) {
        return NextResponse.json(
          {
            error: "No pending 2FA setup found. Please generate a new QR code.",
          },
          { status: 400 },
        );
      }

      const isValid = authenticator.verify({
        token: code,
        secret: tempSecret,
      });

      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid verification code. Please try again." },
          { status: 400 },
        );
      }

      const backupCodes = generateBackupCodes();

      await supabase.auth.updateUser({
        data: {
          two_factor_enabled: true,
          totp_secret: tempSecret,
          totp_temp_secret: null,
          backup_codes: backupCodes,
        },
      });

      return NextResponse.json({
        success: true,
        backupCodes: backupCodes,
      });
    }

    if (action === "disable") {
      await supabase.auth.updateUser({
        data: {
          two_factor_enabled: false,
          totp_secret: null,
          totp_temp_secret: null,
          backup_codes: null,
        },
      });

      return NextResponse.json({ success: true });
    }

    // Verify TOTP code during login (for already authenticated user with pending 2FA)
    if (action === "verify-login") {
      if (!code || code.length !== 6) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 },
        );
      }

      const totpSecret = user.user_metadata?.totp_secret;
      const backupCodes = user.user_metadata?.backup_codes || [];

      if (!totpSecret) {
        return NextResponse.json(
          { error: "2FA is not enabled for this account" },
          { status: 400 },
        );
      }

      // First try TOTP verification
      const isValidTotp = authenticator.verify({
        token: code,
        secret: totpSecret,
      });

      if (isValidTotp) {
        return NextResponse.json({ success: true, method: "totp" });
      }

      // Then try backup code verification
      const normalizedCode = code.toUpperCase();
      const backupCodeIndex = backupCodes.findIndex(
        (bc: string) => bc === normalizedCode,
      );

      if (backupCodeIndex !== -1) {
        // Remove used backup code
        const updatedBackupCodes = [...backupCodes];
        updatedBackupCodes.splice(backupCodeIndex, 1);

        await supabase.auth.updateUser({
          data: {
            backup_codes: updatedBackupCodes,
          },
        });

        return NextResponse.json({
          success: true,
          method: "backup_code",
          remainingBackupCodes: updatedBackupCodes.length,
        });
      }

      return NextResponse.json(
        { error: "Invalid verification code. Please try again." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("2FA API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabase = await getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      enabled: !!user.user_metadata?.two_factor_enabled,
      hasBackupCodes: !!user.user_metadata?.backup_codes?.length,
    });
  } catch (error) {
    console.error("2FA status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
