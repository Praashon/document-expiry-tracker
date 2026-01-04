"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MoreHorizontal, FileIcon } from "lucide-react";
import { motion } from "framer-motion";

const recentDocs: {
    name: string;
    category: string;
    expiry: string;
    status: string;
    statusColor: string;
}[] = [];

export function RecentDocs() {
    return (
        <Card className="col-span-4 border-none shadow-sm dark:bg-neutral-900/50">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Recent Documents</CardTitle>
                    <CardDescription>
                        Your recent documents will appear here.
                    </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="gap-2 text-[#A8BBA3] hover:text-[#92a88d] dark:text-[#A8BBA3]">
                    View All <ArrowRight className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {recentDocs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-neutral-500 dark:text-neutral-400">
                            <FileIcon className="h-12 w-12 mb-3 opacity-20" />
                            <p>No documents found.</p>
                        </div>
                    ) : (
                        recentDocs.map((doc, i) => (
                            <motion.div
                                key={doc.name}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-white dark:bg-neutral-900 flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
                                        <FileIcon className="h-5 w-5 text-neutral-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-[#A8BBA3] transition-colors">{doc.name}</p>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{doc.category}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{doc.expiry}</p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Expiry Date</p>
                                    </div>

                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${doc.statusColor}`}>
                                        {doc.status}
                                    </span>

                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
