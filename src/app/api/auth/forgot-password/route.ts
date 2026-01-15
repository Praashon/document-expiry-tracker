import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { action, email, code } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (action === "check-recovery-options") {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (!user) {
        return NextResponse.json(
          { error: "Email not found. Please check and try again." },
          { status: 404 }
        );
      }

      const hasTwoFactor = !!user.user_metadata?.two_factor_enabled;
      const hasBackupCodes =
        (user.user_metadata?.backup_codes?.length || 0) > 0;

      return NextResponse.json({
        hasTwoFactor: hasTwoFactor && hasBackupCodes,
        message: "Recovery options checked",
      });
    }

    if (action === "send-reset-email") {
      const origin =
        request.headers.get("origin") ||
        request.headers
          .get("referer")
          ?.replace(/\/$/, "")
          .split("/")
          .slice(0, 3)
          .join("/") ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";

      const { error: resetError } =
        await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/reset-password`,
        });

      if (resetError) {
        console.error("Failed to send reset email:", resetError);
        return NextResponse.json(
          { error: "Failed to send reset email" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Password reset email sent",
      });
    }

    if (action === "verify-backup-code") {
      if (!code) {
        return NextResponse.json(
          { error: "Backup code is required" },
          { status: 400 }
        );
      }

      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (!user) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 400 }
        );
      }

      const backupCodes = user.user_metadata?.backup_codes || [];
      const normalizedCode = code.toUpperCase();
      const codeIndex = backupCodes.findIndex(
        (bc: string) => bc === normalizedCode
      );

      if (codeIndex === -1) {
        return NextResponse.json(
          { error: "Invalid backup code" },
          { status: 400 }
        );
      }

      const updatedBackupCodes = [...backupCodes];
      updatedBackupCodes.splice(codeIndex, 1);

      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          backup_codes: updatedBackupCodes,
        },
      });

      const origin =
        request.headers.get("origin") ||
        request.headers
          .get("referer")
          ?.replace(/\/$/, "")
          .split("/")
          .slice(0, 3)
          .join("/") ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";

      await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });

      return NextResponse.json({
        success: true,
        remainingBackupCodes: updatedBackupCodes.length,
        message: "Backup code verified. Password reset email sent.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Forgot password API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
