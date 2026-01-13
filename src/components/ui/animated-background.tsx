"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

export function AnimatedBackground() {
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Mouse position state
    const mouseX = useSpring(0, { stiffness: 50, damping: 20 });
    const mouseY = useSpring(0, { stiffness: 50, damping: 20 });

    // Derived motion values (must be at top level)
    const blurBubble2X = useTransform(mouseX, (v) => v * -1.5);
    const blurBubble2Y = useTransform(mouseY, (v) => v * -1.5);
    const blurBubble3X = useTransform(mouseX, (v) => v * 0.5);
    const blurBubble3Y = useTransform(mouseY, (v) => v * 0.5);

    useEffect(() => {
        setMounted(true);

        const handleMouseMove = (e: MouseEvent) => {
            // Normalize coordinates -1 to 1
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = (e.clientY / window.innerHeight) * 2 - 1;

            mouseX.set(x * 20); // Move 20px max
            mouseY.set(y * 20);
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    if (!mounted) return null;

    const isDark = theme === "dark" || resolvedTheme === "dark";

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none"
            aria-hidden="true"
        >
            {/* Base background color - Custom Nature Theme */}
            <div
                className="absolute inset-0 transition-colors duration-700"
                style={{
                    background: isDark ? "#111410" : "#FDFCF8" // Deep Web/Forest Black vs Warm Off-White
                }}
            />

            {/* Ambient Orbs */}
            <motion.div
                className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-60 dark:opacity-40 blur-[100px]"
                style={{
                    background: isDark
                        ? "radial-gradient(circle, #2C3E2D 0%, transparent 70%)" // Deep Moss
                        : "radial-gradient(circle, #A8BBA3 0%, transparent 70%)", // Brand Sage
                    x: mouseX,
                    y: mouseY,
                }}
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: isDark ? [0.3, 0.4, 0.3] : [0.5, 0.6, 0.5],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    repeatType: "reverse",
                }}
            />

            <motion.div
                className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-40 dark:opacity-20 blur-[120px]"
                style={{
                    background: isDark
                        ? "radial-gradient(circle, #4A3B2F 0%, transparent 70%)" // Deep Earth/Coffee
                        : "radial-gradient(circle, #E8D4BE 0%, transparent 70%)", // Warm Sand
                    x: blurBubble2X,
                    y: blurBubble2Y,
                }}
                animate={{
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    repeatType: "reverse",
                }}
            />

            <motion.div
                className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full opacity-40 dark:opacity-20 blur-[80px]"
                style={{
                    background: isDark
                        ? "radial-gradient(circle, #3E4A35 0%, transparent 70%)" // Olive Shadow
                        : "radial-gradient(circle, #D4C5A3 0%, transparent 70%)", // Champagne Gold
                    x: blurBubble3X,
                    y: blurBubble3Y,
                }}
                animate={{
                    x: [0, 50, 0],
                    y: [0, -30, 0],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    repeatType: "reverse",
                }}
            />

            {/* Noise Texture Overlay for texture */}
            <div
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    filter: 'contrast(120%) brightness(100%)'
                }}
            />
        </div>
    );
}
