"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Mail,
    Loader2,
    ArrowRight,
    ArrowLeft,
    KeyRound,
    Shield,
    CheckCircle,
} from "lucide-react";

type RecoveryStep = "email" | "options" | "backup" | "success";

interface RecoveryOptions {
    hasTwoFactor: boolean;
    email: string;
}

function ForgotPasswordContent() {
    const [email, setEmail] = useState("");
    const [backupCode, setBackupCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<RecoveryStep>("email");
    const [recoveryOptions, setRecoveryOptions] = useState<RecoveryOptions | null>(null);
    const [successMessage, setSuccessMessage] = useState("");

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email) {
            setError("Please enter your email address.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "check-recovery-options", email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to check recovery options");
            }

            setRecoveryOptions({
                hasTwoFactor: data.hasTwoFactor,
                email: email,
            });
            setStep("options");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendResetEmail = async () => {
        setError(null);
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "send-reset-email", email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send reset email");
            }

            setSuccessMessage("Password reset link has been sent to your email. Please check your inbox.");
            setStep("success");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send reset email");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackupCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!backupCode || backupCode.length < 6) {
            setError("Please enter a valid backup code.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "verify-backup-code", email, code: backupCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Invalid backup code");
            }

            setSuccessMessage(`Backup code verified! You have ${data.remainingBackupCodes} codes remaining. A password reset link has been sent to your email.`);
            setStep("success");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Verification failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        setError(null);
        if (step === "options") {
            setStep("email");
            setRecoveryOptions(null);
        } else if (step === "backup") {
            setStep("options");
            setBackupCode("");
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
                {step === "email" && (
                    <>
                        <div className="text-center space-y-2">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="inline-block p-3 rounded-full bg-[#A8BBA3]/10 text-[#A8BBA3] mb-2"
                            >
                                <KeyRound className="w-6 h-6" />
                            </motion.div>
                            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                                Forgot Password
                            </h1>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                Enter your email to recover your account
                            </p>
                        </div>

                        <form className="space-y-4" onSubmit={handleEmailSubmit}>
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

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400 text-center"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-11 flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-xl shadow-lg shadow-[#A8BBA3]/20 text-sm font-semibold text-white bg-[#A8BBA3] hover:bg-[#92a88d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A8BBA3] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Continue <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        </form>

                        <div className="text-sm text-center text-neutral-600 dark:text-neutral-400">
                            Remember your password?{" "}
                            <Link
                                href="/login"
                                className="font-semibold text-[#A8BBA3] hover:text-[#92a88d] hover:underline transition-all"
                            >
                                Back to login
                            </Link>
                        </div>
                    </>
                )}

                {step === "options" && recoveryOptions && (
                    <>
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
                                Recovery Options
                            </h1>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                Choose how you want to recover your account
                            </p>
                        </div>

                        <div className="space-y-3">
                            {recoveryOptions.hasTwoFactor && (
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setStep("backup")}
                                    className="w-full p-4 flex items-center gap-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-750 transition-all"
                                >
                                    <div className="p-2 rounded-lg bg-[#A8BBA3]/10 text-[#A8BBA3]">
                                        <KeyRound className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium text-neutral-900 dark:text-white">
                                            Use Backup Code
                                        </div>
                                        <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                            Enter one of your saved backup codes
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 ml-auto text-neutral-400" />
                                </motion.button>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSendResetEmail}
                                disabled={isLoading}
                                className="w-full p-4 flex items-center gap-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-750 transition-all disabled:opacity-70"
                            >
                                <div className="p-2 rounded-lg bg-[#A8BBA3]/10 text-[#A8BBA3]">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-neutral-900 dark:text-white">
                                        Send Reset Email
                                    </div>
                                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                        Receive a password reset link via email
                                    </div>
                                </div>
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 ml-auto animate-spin text-[#A8BBA3]" />
                                ) : (
                                    <ArrowRight className="w-4 h-4 ml-auto text-neutral-400" />
                                )}
                            </motion.button>
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

                        <button
                            onClick={handleBack}
                            className="w-full flex items-center justify-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-[#A8BBA3] transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                    </>
                )}

                {step === "backup" && (
                    <>
                        <div className="text-center space-y-2">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="inline-block p-3 rounded-full bg-[#A8BBA3]/10 text-[#A8BBA3] mb-2"
                            >
                                <KeyRound className="w-6 h-6" />
                            </motion.div>
                            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                                Enter Backup Code
                            </h1>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                Enter one of your saved backup codes to verify your identity
                            </p>
                        </div>

                        <form className="space-y-4" onSubmit={handleBackupCodeSubmit}>
                            <div className="space-y-2">
                                <label
                                    htmlFor="backupCode"
                                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1"
                                >
                                    Backup Code
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[#A8BBA3] transition-colors">
                                        <KeyRound className="h-5 w-5" />
                                    </div>
                                    <input
                                        id="backupCode"
                                        type="text"
                                        value={backupCode}
                                        onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                                        className="block w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-[#A8BBA3]/20 focus:border-[#A8BBA3] transition-all duration-200 outline-none text-neutral-900 dark:text-white placeholder-neutral-400 text-center text-xl tracking-widest font-mono uppercase"
                                        placeholder="XXXXXX"
                                        maxLength={8}
                                        autoFocus
                                        required
                                    />
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

                            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                                <button
                                    type="submit"
                                    disabled={isLoading || backupCode.length < 6}
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
                        </form>

                        <button
                            onClick={handleBack}
                            className="w-full flex items-center justify-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-[#A8BBA3] transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to options
                        </button>
                    </>
                )}

                {step === "success" && (
                    <>
                        <div className="text-center space-y-2">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="inline-block p-3 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 mb-2"
                            >
                                <CheckCircle className="w-6 h-6" />
                            </motion.div>
                            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                                Check Your Email
                            </h1>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                {successMessage}
                            </p>
                        </div>

                        <Link href="/login">
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full h-11 flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-xl shadow-lg shadow-[#A8BBA3]/20 text-sm font-semibold text-white bg-[#A8BBA3] hover:bg-[#92a88d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A8BBA3] transition-all duration-200"
                            >
                                Back to Login <ArrowRight className="w-4 h-4" />
                            </motion.button>
                        </Link>
                    </>
                )}
            </motion.div>
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
                    <Loader2 className="w-8 h-8 animate-spin text-[#A8BBA3]" />
                </div>
            }
        >
            <ForgotPasswordContent />
        </Suspense>
    );
}
