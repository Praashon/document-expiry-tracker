"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, X, Trash2 } from "lucide-react";
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
      // Don't call onClose here - the parent will handle closing
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete document",
      );
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      onClose();
    }
  };

  // Reset state when modal opens/closes
  const handleAnimationComplete = () => {
    if (!isOpen) {
      setIsDeleting(false);
      setError(null);
    }
  };

  return (
    <AnimatePresence mode="wait" onExitComplete={handleAnimationComplete}>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: {
                type: "spring",
                damping: 25,
                stiffness: 300,
              },
            }}
            exit={{
              opacity: 0,
              scale: 0.9,
              y: 20,
              transition: {
                duration: 0.2,
                ease: "easeInOut",
              },
            }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"
                    initial={{ rotate: 0 }}
                    animate={{
                      rotate: isDeleting ? [0, -10, 10, -10, 10, 0] : 0,
                      scale: isDeleting ? [1, 1.1, 1] : 1,
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: isDeleting ? Infinity : 0,
                      repeatDelay: 0.5,
                    }}
                  >
                    {isDeleting ? (
                      <Trash2 className="w-5 h-5 text-red-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                  </motion.div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    {isDeleting ? "Deleting..." : "Confirm Removal"}
                  </h2>
                </div>
                <motion.button
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm overflow-hidden"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {isDeleting ? (
                    <motion.div
                      key="deleting"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center justify-center py-8 space-y-4"
                    >
                      <motion.div
                        className="relative"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Animated circles */}
                        <motion.div
                          className="absolute inset-0 rounded-full bg-red-100 dark:bg-red-900/30"
                          animate={{
                            scale: [1, 1.5, 1.5],
                            opacity: [0.5, 0, 0],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut",
                          }}
                        />
                        <motion.div
                          className="absolute inset-0 rounded-full bg-red-100 dark:bg-red-900/30"
                          animate={{
                            scale: [1, 1.5, 1.5],
                            opacity: [0.5, 0, 0],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut",
                            delay: 0.5,
                          }}
                        />
                        <div className="relative p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          >
                            <Loader2 className="w-8 h-8 text-red-500" />
                          </motion.div>
                        </div>
                      </motion.div>
                      <motion.p
                        className="text-neutral-600 dark:text-neutral-400 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        Removing{" "}
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          &quot;{documentTitle}&quot;
                        </span>
                      </motion.p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <p className="text-neutral-600 dark:text-neutral-400">
                        You are about to permanently remove{" "}
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          &quot;{documentTitle}&quot;
                        </span>{" "}
                        from your document library.
                      </p>

                      <motion.div
                        className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <p className="text-sm text-red-600 dark:text-red-400">
                          <strong>Warning:</strong> This action cannot be
                          undone. All document data, metadata, and attached
                          files will be permanently deleted.
                        </p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <AnimatePresence mode="wait">
                {!isDeleting && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-3 p-6 pt-0"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={isDeleting}
                      className="flex-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleConfirm}
                      disabled={isDeleting}
                      className="flex-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Document
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
