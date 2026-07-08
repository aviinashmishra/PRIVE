"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { clsx } from "@/lib/format";

type Kind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: Kind;
  title: string;
  desc?: string;
}
interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}
let tid = 1;
export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = tid++;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = {
  success: (title: string, desc?: string) => useToast.getState().push({ kind: "success", title, desc }),
  error: (title: string, desc?: string) => useToast.getState().push({ kind: "error", title, desc }),
  info: (title: string, desc?: string) => useToast.getState().push({ kind: "info", title, desc }),
};

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 w-[340px] max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <ToastCard key={t.id} t={t} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ t, onClose }: { t: Toast; onClose: () => void }) {
  useEffect(() => {}, []);
  const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? XCircle : Info;
  const color = t.kind === "success" ? "text-brand-600" : t.kind === "error" ? "text-down" : "text-ink-soft";
  return (
    <div className="card shadow-lift px-4 py-3.5 flex items-start gap-3 animate-fade-up">
      <Icon className={clsx("h-5 w-5 mt-0.5 shrink-0", color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink leading-snug">{t.title}</p>
        {t.desc && <p className="text-xs text-ink-soft mt-0.5 leading-snug tnum">{t.desc}</p>}
      </div>
      <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
