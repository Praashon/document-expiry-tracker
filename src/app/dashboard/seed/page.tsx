"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase, DocumentType, DocumentCategory } from "@/lib/supabase";
import { Loader2, CheckCircle, AlertCircle, Database } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useRouter } from "next/navigation";
import { AIChat } from "@/components/chat/ai-chat";

const FAKE_DOCS = [
    {
        name: "My Passport",
        file: "fake_passport.png",
        type: "Passport" as DocumentType,
        category: "identity" as DocumentCategory,
        expiryOffsetDays: 365 * 2, // Valid for 2 years
    },
    {
        name: "Driving License",
        file: "fake_driving_license.png",
        type: "Driving License" as DocumentType,
        category: "identity" as DocumentCategory,
        expiryOffsetDays: 15, // Expiring soon
    },
    {
        name: "Vehicle Bluebook",
        file: "fake_bluebook.png",
        type: "License" as DocumentType,
        category: "expiring" as DocumentCategory,
        expiryOffsetDays: -10, // Expired
    },
    {
        name: "Rent Agreement",
        file: "fake_passport.png", // Reusing image
        type: "Rent Agreement" as DocumentType,
        category: "expiring" as DocumentCategory,
        expiryOffsetDays: 180,
    },
    {
        name: "Health Insurance",
        file: "fake_bluebook.png", // Reusing
        type: "Insurance" as DocumentType,
        category: "expiring" as DocumentCategory,
        expiryOffsetDays: 5, // Expiring very soon
    },
];

export default function SeedDataPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

    const handleSeed = async () => {
        if (!user) return;
        setLoading(true);
        setStatus("idle");
        setLogs([]);
        addLog("Starting data seeding...");

        try {
            for (const doc of FAKE_DOCS) {
                addLog(`Processing ${doc.name}...`);

                // 1. Fetch the fake file
                const res = await fetch(`/fake_documents/${doc.file}`);
                if (!res.ok) throw new Error(`Failed to load ${doc.file}`);
                const blob = await res.blob();
                const file = new File([blob], doc.file, { type: "image/png" });

                // 2. Upload to Storage
                const fileExt = "png";
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `${user.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("documents")
                    .upload(filePath, file);

                if (uploadError) throw uploadError;
                addLog(`Uploaded file: ${fileName}`);

                // 3. Insert to Database
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + doc.expiryOffsetDays);

                const { error: dbError } = await supabase.from("documents").insert({
                    title: doc.name,
                    type: doc.type,
                    category: doc.category,
                    expiration_date: expiryDate.toISOString(),
                    // Reminder 30 days before
                    reminder_date: new Date(expiryDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    file_path: filePath,
                    file_name: doc.file,
                    file_type: "image/png",
                    file_size: file.size,
                    user_id: user.id,
                });

                if (dbError) throw dbError;
                addLog(`Created database entry for ${doc.name}`);
            }

            setStatus("success");
            addLog("Seeding completed successfully!");
            // Redirect to analytics after a delay
            setTimeout(() => router.push("/dashboard/analytics"), 2000);

        } catch (error) {
            console.error("Seed error:", error);
            setStatus("error");
            // Handle Supabase errors which have a different structure
            const errorMsg = error instanceof Error
                ? error.message
                : (error as { message?: string; error_description?: string; details?: string })?.message
                || (error as { message?: string; error_description?: string; details?: string })?.error_description
                || (error as { message?: string; error_description?: string; details?: string })?.details
                || JSON.stringify(error);
            addLog(`Error: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
            <Sidebar />
            <div className="flex-1 md:ml-16">
                <Header user={user} sidebarCollapsed={true} />
                <main className="p-8 flex items-center justify-center">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Seed Fake Data
                            </CardTitle>
                            <CardDescription>
                                Populate your account with sample documents for testing analytics.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-neutral-100 dark:bg-neutral-900 p-4 rounded-md h-48 overflow-y-auto text-xs font-mono">
                                {logs.length === 0 ? (
                                    <span className="text-neutral-400">Activity logs will appear here...</span>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="mb-1">{log}</div>
                                    ))
                                )}
                            </div>

                            <Button
                                onClick={handleSeed}
                                disabled={loading || !user}
                                className="w-full bg-[#A8BBA3] hover:bg-[#92a88d] text-white"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? "Seeding..." : "Generate Sample Data"}
                            </Button>

                            {status === "success" && (
                                <div className="flex items-center gap-2 text-green-600 justify-center text-sm">
                                    <CheckCircle className="h-4 w-4" />
                                    Data created successfully! Redirecting...
                                </div>
                            )}
                            {status === "error" && (
                                <div className="flex items-center gap-2 text-red-600 justify-center text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    Seeding failed. Check logs.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </main>
            </div>
            <AIChat />
        </div>
    );
}
