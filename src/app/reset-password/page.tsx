"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { motion } from "framer-motion";
import {
    Lock,
    Loader2,
    ArrowRight,
    CheckCircle,
    Eye,
    EyeOff,
} from "lucide-react";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    useEffect(() => {
        const handleRecovery = async () => {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token");
            const type = hashParams.get("type");

            if (accessToken && refreshToken && type === "recovery") {
                const { error } = await supabaseBrowser.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (!error) {
                    setIsValidSession(true);
                    setIsCheckingSession(false);
                    window.history.replaceState({}, "", "/reset-password");
                    return;
                }
            }

            const { data: { session } } = await supabaseBrowser.auth.getSession();
            setIsValidSession(!!session);
            setIsCheckingSession(false);
        };

        handleRecovery();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        try {
            const { error: updateError } = await supabaseBrowser.auth.updateUser({
                password: password,
            });

            if (updateError) {
                throw updateError;
            }

            setIsSuccess(true);
            setTimeout(() => {
                router.push("/dashboard");
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update password");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestNewLink = () => {
        router.push("/forgot-password");
    };

    if (isCheckingSession) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
                <Loader2 className="w-8 h-8 animate-spin text-[#A8BBA3]" />
            </div>
        );
    }

    if (!isValidSession) {
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
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md p-8 space-y-6 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 z-10 text-center"
                >
                    <div className="inline-block p-3 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 mb-2">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                        Invalid or Expired Link
                    </h1>
                    <p className="text-neutral-600 dark:text-neutral-400">
                        This password reset link is invalid or has expired.
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleRequestNewLink}
                        className="w-full h-11 flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-xl shadow-lg shadow-[#A8BBA3]/20 text-sm font-semibold text-white bg-[#A8BBA3] hover:bg-[#92a88d] transition-all duration-200"
                    >
                        Request New Link <ArrowRight className="w-4 h-4" />
                    </motion.button>
                </motion.div>
            </div>
        );
    }

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
                {!isSuccess ? (
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
                                Create New Password
                            </h1>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                Enter a strong password for your account
                            </p>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1"
                                >
                                    New Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[#A8BBA3] transition-colors">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-12 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-[#A8BBA3]/20 focus:border-[#A8BBA3] transition-all duration-200 outline-none text-neutral-900 dark:text-white placeholder-neutral-400"
                                        placeholder="Enter new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="confirmPassword"
                                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1"
                                >
                                    Confirm Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[#A8BBA3] transition-colors">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full pl-10 pr-12 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-[#A8BBA3]/20 focus:border-[#A8BBA3] transition-all duration-200 outline-none text-neutral-900 dark:text-white placeholder-neutral-400"
                                        placeholder="Confirm new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="text-xs text-neutral-500 dark:text-neutral-400 ml-1">
                                Password must be at least 8 characters long
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
                                    disabled={isLoading || !password || !confirmPassword}
                                    className="w-full h-11 flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-xl shadow-lg shadow-[#A8BBA3]/20 text-sm font-semibold text-white bg-[#A8BBA3] hover:bg-[#92a88d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A8BBA3] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Update Password <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        </form>
                    </>
                ) : (
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
                                Password Updated
                            </h1>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                Your password has been successfully updated. Redirecting to dashboard...
                            </p>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}
