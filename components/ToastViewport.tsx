"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

export type ToastItem = {
  id: number;
  kind: "success" | "error" | "info";
  title: string;
  message: string;
};

export function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-4 top-20 z-[80] flex flex-col items-end gap-3 sm:left-auto sm:w-[390px]" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const Icon = toast.kind === "success" ? CheckCircle2 : toast.kind === "error" ? CircleAlert : Info;
        return (
          <div key={toast.id} role="status" className={`toast pointer-events-auto ${toast.kind}`}>
            <span className="toast-icon"><Icon className="size-5" /></span>
            <div className="min-w-0 flex-1"><strong className="block text-sm text-white">{toast.title}</strong><p className="mt-0.5 text-xs leading-5 text-slate-400">{toast.message}</p></div>
            <button onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification" className="rounded-lg p-1 text-slate-500 transition hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
          </div>
        );
      })}
    </div>
  );
}

