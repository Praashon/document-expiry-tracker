"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  X,
  Bot,
  User,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isOutOfScope?: boolean;
  isError?: boolean;
}

interface AIChatProps {
  isOpen?: boolean;
  onToggle?: () => void;
  floating?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "How do I add a new document?",
  "What document types can I track?",
  "How do I enable 2FA?",
  "How do reminders work?",
  "How do I change my avatar?",
];

export function AIChat({
  isOpen: controlledIsOpen,
  onToggle,
  floating = true,
}: AIChatProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onToggle || setInternalIsOpen;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if the AI is configured
    fetch("/api/chat")
      .then((res) => res.json())
      .then((data) => {
        setIsConfigured(data.status === "ready");
      })
      .catch(() => {
        setIsConfigured(false);
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        isOutOfScope: data.isOutOfScope,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        isError: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-[#A8BBA3]/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-[#A8BBA3]/20">
            <Sparkles className="h-5 w-5 text-[#A8BBA3]" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              DocTracker Assistant
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Ask me anything about the app
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="h-8 w-8 p-0 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              title="Clear chat"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          {floating && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isConfigured && isConfigured !== null && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              AI Assistant is not configured. Please add OPENROUTER_API_KEY to
              your environment variables.
            </span>
          </div>
        )}

        {messages.length === 0 && isConfigured && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#A8BBA3]/10 mb-4">
              <Bot className="h-8 w-8 text-[#A8BBA3]" />
            </div>
            <h4 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              How can I help you?
            </h4>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-xs mx-auto">
              Ask me anything about DocTracker - managing documents, settings,
              security, and more.
            </p>

            {/* Suggested questions */}
            <div className="space-y-2">
              <p className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Suggested questions
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="px-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === "user"
                    ? "bg-[#A8BBA3] text-white"
                    : message.isError
                      ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      : message.isOutOfScope
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {message.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              <div
                className={`flex-1 max-w-[80%] ${
                  message.role === "user" ? "text-right" : ""
                }`}
              >
                <div
                  className={`inline-block px-4 py-2.5 rounded-2xl text-sm ${
                    message.role === "user"
                      ? "bg-[#A8BBA3] text-white rounded-tr-sm"
                      : message.isError
                        ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-tl-sm"
                        : message.isOutOfScope
                          ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-tl-sm"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                <div
                  className={`text-xs text-neutral-400 mt-1 ${
                    message.role === "user" ? "text-right" : ""
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Bot className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-tl-sm">
              <Loader2 className="h-4 w-4 animate-spin text-[#A8BBA3]" />
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                Thinking...
              </span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about DocTracker..."
            disabled={isLoading || !isConfigured}
            className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-full text-sm text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#A8BBA3]/50 disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim() || !isConfigured}
            className="h-10 w-10 p-0 rounded-full bg-[#A8BBA3] hover:bg-[#92a88d] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );

  if (!floating) {
    return (
      <div className="h-full w-full bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {chatContent}
      </div>
    );
  }

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#A8BBA3] hover:bg-[#92a88d] text-white shadow-lg shadow-[#A8BBA3]/30 flex items-center justify-center transition-colors"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] max-h-[80vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col"
          >
            {chatContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
