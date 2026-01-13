"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    MoreVertical,
    Eye,
    Download,
    Edit,
    Trash2,
    FileText,
    Calendar,
    Home,
    Shield,
    Bookmark,
    FileCheck,
    Package,
    ScrollText,
    CreditCard,
    Car,
    Vote,
} from "lucide-react";
import { useState } from "react";
import {
    type Document,
    type DocumentType,
    getDaysUntilExpiration,
} from "@/lib/document-actions";
import { DOCUMENT_TYPE_CONFIG } from "@/lib/supabase";

interface DocumentGridProps {
    documents: Document[];
    onView: (doc: Document) => void;
    onEdit: (doc: Document) => void;
    onDelete: (doc: Document) => void;
    onDownload: (doc: Document) => void;
}

const TYPE_ICONS: Record<DocumentType, React.ElementType> = {
    "Rent Agreement": Home,
    Insurance: Shield,
    Subscription: Bookmark,
    License: FileCheck,
    Warranty: Package,
    Contract: ScrollText,
    Citizenship: FileText,
    "PAN Card": CreditCard,
    "National ID": CreditCard,
    Passport: FileText,
    "Driving License": Car,
    "Voter ID": Vote,
    "Birth Certificate": ScrollText,
    Other: FileText,
};

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return "No expiry";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function ExpiryProgress({ daysLeft }: { daysLeft: number }) {
    // Normalize days for progress bar (max 365 days)
    const percentage = Math.max(0, Math.min(100, (daysLeft / 365) * 100));

    let colorClass = "bg-[#A8BBA3]";
    if (daysLeft < 30) colorClass = "bg-orange-500";
    if (daysLeft < 0) colorClass = "bg-red-500";

    return (
        <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-3">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full ${colorClass}`}
            />
        </div>
    );
}

export function DocumentGrid({
    documents,
    onView,
    onEdit,
    onDelete,
    onDownload,
}: DocumentGridProps) {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    if (documents.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
            >
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center mb-6 shadow-sm">
                    <FileText className="h-10 w-10 text-neutral-300 dark:text-neutral-600" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                    No matching documents
                </h3>
                <p className="text-neutral-500 max-w-sm mx-auto">
                    Try adjusting your filters or search terms to find what you're looking for.
                </p>
            </motion.div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout" initial={false}>
                    {documents.map((doc, index) => {
                        const daysUntil = getDaysUntilExpiration(doc.expiration_date);
                        const config = DOCUMENT_TYPE_CONFIG[doc.type as DocumentType];
                        const TypeIcon = TYPE_ICONS[doc.type as DocumentType] || FileText;

                        return (
                            <motion.div
                                key={doc.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    transition: {
                                        delay: index * 0.05,
                                        duration: 0.2
                                    }
                                }}
                                exit={{
                                    opacity: 0,
                                    scale: 0.9,
                                    transition: { duration: 0.1 }
                                }}
                                transition={{
                                    layout: { duration: 0.3, ease: "circOut" }
                                }}
                                className="group relative bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 hover:border-[#A8BBA3]/50 dark:hover:border-[#A8BBA3]/30 transition-all hover:shadow-lg hover:shadow-neutral-900/5 dark:hover:shadow-black/20"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl ${config?.bgColor || "bg-neutral-50 dark:bg-neutral-800"} group-hover:scale-105 transition-transform duration-300`}>
                                        <TypeIcon className={`h-6 w-6 ${config?.color || "text-neutral-600"}`} />
                                    </div>

                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === doc.id ? null : doc.id!);
                                            }}
                                            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </button>

                                        <AnimatePresence>
                                            {openMenuId === doc.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                    style={{ transformOrigin: "top right" }}
                                                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden z-20"
                                                >
                                                    <div className="p-1.5 flex flex-col gap-0.5">
                                                        <button onClick={() => { onView(doc); setOpenMenuId(null); }} className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2">
                                                            <Eye className="h-4 w-4 text-neutral-500" /> View Details
                                                        </button>
                                                        {doc.file_path && (
                                                            <button onClick={() => { onDownload(doc); setOpenMenuId(null); }} className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2">
                                                                <Download className="h-4 w-4 text-neutral-500" /> Download
                                                            </button>
                                                        )}
                                                        <button onClick={() => { onEdit(doc); setOpenMenuId(null); }} className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2">
                                                            <Edit className="h-4 w-4 text-neutral-500" /> Edit Document
                                                        </button>
                                                        <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />
                                                        <button onClick={() => { onDelete(doc); setOpenMenuId(null); }} className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2">
                                                            <Trash2 className="h-4 w-4" /> Delete
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 truncate pr-8" title={doc.title}>
                                        {doc.title}
                                    </h3>
                                    <p className="text-sm text-neutral-500 mb-4">{doc.type}</p>

                                    <div className="grid grid-cols-2 gap-4 text-xs text-neutral-500">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-1.5 opacity-70"><Calendar className="h-3 w-3" /> Expiry</span>
                                            <span className={`font-medium ${daysUntil !== null && daysUntil < 30 ? "text-orange-600 dark:text-orange-500" : "text-neutral-700 dark:text-neutral-300"}`}>
                                                {formatDate(doc.expiration_date)}
                                            </span>
                                        </div>
                                    </div>

                                    {daysUntil !== null && <ExpiryProgress daysLeft={daysUntil} />}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {openMenuId && (
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
            )}
        </>
    );
}
