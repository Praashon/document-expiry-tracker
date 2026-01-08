"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  documentTitle: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  documentTitle,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setIsDeleting(true);

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete document",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Confirm Document Removal
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <p className="text-neutral-600 dark:text-neutral-400">
                  You are about to permanently remove{" "}
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    &quot;{documentTitle}&quot;
                  </span>{" "}
                  from your document library. Please confirm this action.
                </p>

                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    <strong>Notice:</strong> This operation is irreversible. All
                    document data, metadata, and associated file attachments
                    will be permanently removed from the system.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancel Operation
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirm}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing Removal...
                    </>
                  ) : (
                    "Confirm Removal"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
