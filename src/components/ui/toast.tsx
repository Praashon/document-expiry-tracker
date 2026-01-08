"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove toast after duration (default 5 seconds)
    setTimeout(() => {
      removeToast(id);
    }, toast.duration || 5000);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    success: {
      container: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
      icon: "text-green-600 dark:text-green-400",
      title: "text-green-900 dark:text-green-100",
      message: "text-green-700 dark:text-green-300",
    },
    error: {
      container: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
      icon: "text-red-600 dark:text-red-400",
      title: "text-red-900 dark:text-red-100",
      message: "text-red-700 dark:text-red-300",
    },
    warning: {
      container: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
      icon: "text-orange-600 dark:text-orange-400",
      title: "text-orange-900 dark:text-orange-100",
      message: "text-orange-700 dark:text-orange-300",
    },
    info: {
      container: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
      icon: "text-blue-600 dark:text-blue-400",
      title: "text-blue-900 dark:text-blue-100",
      message: "text-blue-700 dark:text-blue-300",
    },
  };

  const Icon = icons[toast.type];
  const style = styles[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm",
        style.container
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", style.icon)} />

      <div className="flex-1 min-w-0">
        <h4 className={cn("font-medium text-sm", style.title)}>
          {toast.title}
        </h4>
        {toast.message && (
          <p className={cn("text-sm mt-1", style.message)}>
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={onClose}
        className={cn(
          "shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
          style.icon
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
