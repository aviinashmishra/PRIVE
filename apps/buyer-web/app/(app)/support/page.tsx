"use client";

import { useEffect, useState } from "react";
import { Field, TextInput, FormError, FormNotice } from "@/components/auth/bits";
import { StatusChip } from "@/components/support/StatusChip";
import { clsx } from "@/lib/format";
import { LifeBuoy, Send, ChevronDown } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
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

const CATEGORIES = [
  ["general", "General question"],
  ["trading", "Trading & orders"],
  ["verification", "KYC / verification"],
  ["payments", "Deposits & withdrawals"],
  ["security", "Account security"],
  ["bug", "Report a bug"],
] as const;

function Thread({ ticketId, onReplied }: { ticketId: string; onReplied: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch(`/api/tickets/${ticketId}`, { cache: "no-store" });
    if (r.ok) setMessages((await r.json()).data.messages);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    await fetch(`/api/tickets/${ticketId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply }),
    });
    setReply("");
    setBusy(false);
    load();
    onReplied();
  }

  return (
    <div className="border-t border-line bg-mist/40 px-5 py-4 space-y-3">
      {messages.map((m) => (
        <div key={m.id} className={clsx("flex", m.authorRole === "support" ? "justify-start" : "justify-end")}>
          <div
            className={clsx(
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              m.authorRole === "support"
                ? "bg-paper border border-line text-ink"
                : "bg-brand-600 text-white",
            )}
          >
            <p className={clsx("text-[10px] font-semibold uppercase tracking-wide mb-1", m.authorRole === "support" ? "text-brand-700" : "text-white/70")}>
              {m.authorName} · {new Date(m.createdAt).toLocaleString()}
            </p>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </div>
        </div>
      ))}
      <form onSubmit={send} className="flex gap-2 pt-1">
        <TextInput
          placeholder="Write a reply…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          className="!bg-paper"
        />
        <button className="btn-primary !px-4 shrink-0" disabled={busy} aria-label="Send reply">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/tickets", { cache: "no-store" });
    if (r.ok) setTickets((await r.json()).data);
  }
  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg({});
    setBusy(true);
    const r = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, category, body }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg({ err: j.error || "Failed to open ticket." });
    setMsg({ ok: "Ticket opened — our team typically replies within a few hours." });
    setSubject("");
    setBody("");
    load();
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">Support center</h2>
        <p className="text-sm text-ink-soft mt-1">
          Raise a ticket and track it here — replies also appear in this thread.
        </p>
      </div>

      <section className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-brand-50 text-brand-600">
            <LifeBuoy className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="font-semibold text-ink leading-none">Open a ticket</h3>
            <p className="text-xs text-ink-faint mt-1">Median first response: 2h 14m</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <FormNotice message={msg.ok ?? null} />
          <FormError message={msg.err ?? null} />
          <div className="grid sm:grid-cols-[1fr_220px] gap-4">
            <Field label="Subject">
              <TextInput required minLength={4} maxLength={140} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Briefly, what's the issue?" />
            </Field>
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
              >
                {CATEGORIES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Details">
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What happened, what did you expect, and any order/certificate IDs…"
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 resize-y"
            />
          </Field>
          <div className="flex justify-end">
            <button className="btn-primary" disabled={busy}>
              {busy ? "Opening…" : "Open ticket"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-ink">Your tickets</h3>
        {tickets.length === 0 && (
          <p className="text-sm text-ink-faint card p-5">No tickets yet — everything running smoothly.</p>
        )}
        {tickets.map((t) => (
          <div key={t.id} className="card overflow-hidden">
            <button
              onClick={() => setOpenId(openId === t.id ? null : t.id)}
              className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-mist/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink text-sm truncate">{t.subject}</p>
                <p className="text-xs text-ink-faint mt-0.5">
                  #{t.id.slice(0, 8)} · {t.category} · updated {new Date(t.updatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusChip status={t.status} />
                <ChevronDown className={clsx("h-4 w-4 text-ink-faint transition-transform", openId === t.id && "rotate-180")} />
              </div>
            </button>
            {openId === t.id && <Thread ticketId={t.id} onReplied={load} />}
          </div>
        ))}
      </section>
    </div>
  );
}
