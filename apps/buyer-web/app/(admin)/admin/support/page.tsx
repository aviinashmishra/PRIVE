"use client";

import { useEffect, useState } from "react";
import { clsx } from "@/lib/format";
import { Send, ChevronDown, Inbox } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  name: string;
  email: string;
  category: string;
  status: string;
  priority: string;
  createdAt: number;
  updatedAt: number;
}

interface Message {
  id: string;
  authorRole: "user" | "support";
  authorName: string;
  body: string;
  createdAt: number;
}

const STATUSES = ["all", "open", "in_progress", "resolved"] as const;

function DarkStatus({ status }: { status: string }) {
  const cls =
    status === "resolved"
      ? "text-[#23C286] border-[#23C286]/30 bg-[#23C286]/10"
      : status === "in_progress"
        ? "text-sky-400 border-sky-400/30 bg-sky-400/10"
        : "text-amber-400 border-amber-400/30 bg-amber-400/10";
  return (
    <span className={clsx("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", cls)}>
      {status.replace("_", " ")}
    </span>
  );
}

function AdminThread({ ticket, onChange }: { ticket: Ticket; onChange: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch(`/api/tickets/${ticket.id}`, { cache: "no-store" });
    if (r.ok) setMessages((await r.json()).data.messages);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    await fetch(`/api/tickets/${ticket.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply }),
    });
    setReply("");
    setBusy(false);
    load();
    onChange();
  }

  async function setStatus(status: string) {
    await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onChange();
  }

  return (
    <div className="border-t admin-line px-5 py-4 space-y-3">
      <div className="flex items-center gap-2">
        {["open", "in_progress", "resolved"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={clsx(
              "admin-chip !cursor-pointer transition-colors",
              ticket.status === s && "!border-[#23C286] !text-[#23C286]",
            )}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>
      {messages.map((m) => (
        <div key={m.id} className={clsx("flex", m.authorRole === "support" ? "justify-end" : "justify-start")}>
          <div
            className={clsx(
              "max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
              m.authorRole === "support" ? "bg-[#23C286] text-[#06110B]" : "admin-card text-[#E7EFE9]",
            )}
          >
            <p className={clsx("text-[10px] font-semibold uppercase tracking-wide mb-1", m.authorRole === "support" ? "text-[#06110B]/60" : "admin-faint")}>
              {m.authorName} · {new Date(m.createdAt).toLocaleString()}
            </p>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </div>
        </div>
      ))}
      <form onSubmit={send} className="flex gap-2 pt-1">
        <input
          className="admin-input flex-1"
          placeholder="Reply as Prive Support…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <button
          className="btn bg-[#23C286] text-[#06110B] px-4 py-2 hover:opacity-90"
          disabled={busy}
          aria-label="Send reply"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/tickets", { cache: "no-store" });
    if (r.ok) setTickets((await r.json()).data);
  }
  useEffect(() => {
    load();
  }, []);

  const shown = tickets.filter((t) => filter === "all" || t.status === filter);
  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">Support desk</h2>
          <p className="text-sm admin-soft mt-1">
            {openCount} open · {tickets.length} total tickets
          </p>
        </div>
        <div className="flex gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={clsx("admin-chip !cursor-pointer", filter === s && "!border-[#23C286] !text-[#23C286]")}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && (
        <div className="admin-card p-8 text-center admin-soft">
          <Inbox className="h-6 w-6 mx-auto mb-2 admin-faint" />
          No tickets in this view.
        </div>
      )}

      <div className="space-y-3">
        {shown.map((t) => (
          <div key={t.id} className="admin-card overflow-hidden">
            <button
              onClick={() => setOpenId(openId === t.id ? null : t.id)}
              className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left admin-row transition-colors"
            >
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm truncate">{t.subject}</p>
                <p className="text-xs admin-faint mt-0.5">
                  {t.name} · {t.email} · #{t.id.slice(0, 8)} · {t.category} · priority {t.priority}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <DarkStatus status={t.status} />
                <ChevronDown className={clsx("h-4 w-4 admin-faint transition-transform", openId === t.id && "rotate-180")} />
              </div>
            </button>
            {openId === t.id && <AdminThread ticket={t} onChange={load} />}
          </div>
        ))}
      </div>
    </div>
  );
}
