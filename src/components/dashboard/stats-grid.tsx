"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertCircle, CheckCircle, Clock } from "lucide-react";

const stats = [
    {
        title: "Total Documents",
        value: "0",
        description: "No documents yet",
        icon: FileText,
        color: "text-blue-500",
        bgColor: "bg-blue-50 dark:bg-blue-900/10",
    },
    {
        title: "Expiring Soon",
        value: "0",
        description: "Within 30 days",
        icon: Clock,
        color: "text-orange-500",
        bgColor: "bg-orange-50 dark:bg-orange-900/10",
    },
    {
        title: "Expired",
        value: "0",
        description: "Action required",
        icon: AlertCircle,
        color: "text-red-500",
        bgColor: "bg-red-50 dark:bg-red-900/10",
    },
    {
        title: "Valid",
        value: "0",
        description: "Active documents",
        icon: CheckCircle,
        color: "text-[#A8BBA3]",
        bgColor: "bg-[#A8BBA3]/10 dark:bg-[#A8BBA3]/10",
    },
];

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
};

export function StatsGrid() {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
            {stats.map((stat, index) => (
                <motion.div key={stat.title} variants={item}>
                    <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow dark:bg-neutral-900/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-full ${stat.bgColor}`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </motion.div>
    );
}
