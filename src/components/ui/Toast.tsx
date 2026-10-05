"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    ({ title, description, tone = "info" }) => {
      const id = ++counter;
      setToasts((current) => [...current.slice(-2), { id, title, description, tone }]);
      // Errors linger longer because they usually need reading.
      window.setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3800);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, tone: "success" }),
      error: (title, description) => toast({ title, description, tone: "error" }),
      info: (title, description) => toast({ title, description, tone: "info" }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(calc(100vw-2rem),380px)] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 border bg-surface-card/95 p-4 shadow-panel-lg backdrop-blur-md",
                t.tone === "success" && "border-tertiary/40",
                t.tone === "error" && "border-error/50",
                t.tone === "info" && "border-border-active/50",
              )}
              role="status"
              aria-live="polite"
            >
              <span className="mt-0.5 shrink-0">
                {t.tone === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-tertiary" aria-hidden />
                ) : t.tone === "error" ? (
                  <AlertTriangle className="h-4 w-4 text-error" aria-hidden />
                ) : (
                  <Info className="h-4 w-4 text-primary-fixed-dim" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-label-button text-label-button uppercase tracking-wider text-text-primary">
                  {t.title}
                </p>
                {t.description ? (
                  <p className="mt-1 font-body-sm text-body-sm text-text-secondary">{t.description}</p>
                ) : null}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="-m-1 shrink-0 p-1 text-text-muted transition-colors hover:text-text-primary"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}