"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInWithGoogle } from "@/lib/auth-actions";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  Shield,
  KeyRound,
} from "lucide-react";

interface AuthError {
  message?: string;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type LoginStep = "credentials" | "2fa";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");
  const [isOAuthFlow, setIsOAuthFlow] = useState(false);
  const [backupCodeWarning, setBackupCodeWarning] = useState<string | null>(
    null,
  );

  // Check if redirected from OAuth callback with 2FA requirement
  useEffect(() => {
    const step = searchParams.get("step");
    const provider = searchParams.get("provider");

    if (step === "2fa" && provider === "oauth") {
      setLoginStep("2fa");
      setIsOAuthFlow(true);
    }
  }, [searchParams]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signInError } =
        await supabaseBrowser.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        throw signInError;
      }

      // Check if user has 2FA enabled
      const user = data.user;
      const twoFactorEnabled = user?.user_metadata?.two_factor_enabled;

      if (twoFactorEnabled) {
        // User has 2FA enabled, show TOTP verification step
        setLoginStep("2fa");
        setIsLoading(false);
      } else {
        // No 2FA, proceed to dashboard
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      const authErr = err as AuthError;
      console.error("[Login] Error:", authErr);
      setError(authErr.message || "Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBackupCodeWarning(null);

    if (!totpCode || totpCode.length < 6) {
      setError("Please enter a valid 6-digit code or backup code.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-login", code: totpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // Check if backup code was used
      if (data.method === "backup_code") {
        setBackupCodeWarning(
          `Backup code used. You have ${data.remainingBackupCodes} backup codes remaining.`,
        );
        // Brief delay to show the warning before redirect
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      } else {
        // TOTP verified successfully
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      const authErr = err as AuthError;
      console.error("[2FA Verification] Error:", authErr);
      setError(authErr.message || "Verification failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleCancelTwoFactor = async () => {
    // Sign out the user since they haven't completed 2FA
    await supabaseBrowser.auth.signOut();
    setLoginStep("credentials");
    setIsOAuthFlow(false);
    setTotpCode("");
    setError(null);
    setBackupCodeWarning(null);
    // Clear URL params
    window.history.replaceState({}, "", "/login");
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const authErr = err as AuthError;
      console.error("[Google Sign In] Error:", authErr);
      setError(
        authErr.message ||
        "Authentication failed. Please verify your credentials and try again.",
      );
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-linear-to-br from-[#A8BBA3]/20 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -60, 0],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-linear-to-tl from-[#A8BBA3]/20 to-transparent rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md p-8 space-y-6 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 z-10"
      >
        {loginStep === "credentials" ? (
          <>
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-block p-3 rounded-full bg-[#A8BBA3]/10 text-[#A8BBA3] mb-2"
              >
                <Lock className="w-6 h-6" />
              </motion.div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Account Access
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Access your DocTracker Enterprise dashboard
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full h-11 flex items-center justify-center gap-3 py-2 px-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A8BBA3] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <GoogleIcon className="w-5 h-5" />
                  Enterprise Google Authentication
                </>
              )}
            </motion.button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white/80 dark:bg-neutral-900/80 text-neutral-500">
                  or continue with email
                </span>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1"
                  >
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[#A8BBA3] transition-colors">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-[#A8BBA3]/20 focus:border-[#A8BBA3] transition-all duration-200 outline-none text-neutral-900 dark:text-white placeholder-neutral-400"
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1"
                  >
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[#A8BBA3] transition-colors">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-[#A8BBA3]/20 focus:border-[#A8BBA3] transition-all duration-200 outline-none text-neutral-900 dark:text-white placeholder-neutral-400"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400 text-center"
                >
                  {error}
                </motion.div>
              )}

              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full h-11 flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-xl shadow-lg shadow-[#A8BBA3]/20 text-sm font-semibold text-white bg-[#A8BBA3] hover:bg-[#92a88d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A8BBA3] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Access Dashboard <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.div>
            </form>

            <div className="text-sm text-center text-neutral-600 dark:text-neutral-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-[#A8BBA3] hover:text-[#92a88d] hover:underline transition-all"
              >
                Create an account
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* 2FA Verification Step */}
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-block p-3 rounded-full bg-[#A8BBA3]/10 text-[#A8BBA3] mb-2"
              >
                <Shield className="w-6 h-6" />
              </motion.div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Two-Factor Authentication
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {isOAuthFlow
                  ? "Your account has 2FA enabled. Enter the code to continue."
                  : "Enter the 6-digit code from your authenticator app"}
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleTotpSubmit}>
              <div className="space-y-2">
                <label
                  htmlFor="totpCode"
                  className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1"
                >
                  Verification Code
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[#A8BBA3] transition-colors">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <input
                    id="totpCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={totpCode}
                    onChange={(e) => {
                      // Allow both numeric codes and alphanumeric backup codes
                      const value = e.target.value
                        .replace(/[^a-zA-Z0-9]/g, "")
                        .toUpperCase();
                      if (value.length <= 8) {
                        setTotpCode(value);
                      }
                    }}
                    className="block w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-[#A8BBA3]/20 focus:border-[#A8BBA3] transition-all duration-200 outline-none text-neutral-900 dark:text-white placeholder-neutral-400 text-center text-xl tracking-widest font-mono"
                    placeholder="000000"
                    maxLength={8}
                    autoFocus
                    required
                  />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-2">
                  You can also use a backup code if you don&apos;t have access
                  to your authenticator
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400 text-center"
                >
                  {error}
                </motion.div>
              )}

              {backupCodeWarning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 text-sm text-amber-600 dark:text-amber-400 text-center"
                >
                  {backupCodeWarning}
                </motion.div>
              )}

              <div className="space-y-3">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button
                    type="submit"
                    disabled={isLoading || totpCode.length < 6}
                    className="w-full h-11 flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-xl shadow-lg shadow-[#A8BBA3]/20 text-sm font-semibold text-white bg-[#A8BBA3] hover:bg-[#92a88d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A8BBA3] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Verify Code <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </motion.div>

                <button
                  type="button"
                  onClick={handleCancelTwoFactor}
                  className="w-full h-11 flex items-center justify-center gap-2 py-2 px-4 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A8BBA3] transition-all duration-200"
                >
                  Cancel and sign out
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
          <Loader2 className="w-8 h-8 animate-spin text-[#A8BBA3]" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
