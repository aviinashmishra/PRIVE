"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const KEY = "prive-cookie-consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage unavailable — don't block the app */
    }
  }, []);

  function choose(value: "all" | "essential") {
    try {
      localStorage.setItem(KEY, JSON.stringify({ value, at: Date.now() }));
    } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-4 sm:max-w-sm z-[70] card p-5 shadow-lift animate-[cookieIn_.45s_cubic-bezier(.22,1,.36,1)]"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className="grid place-items-center h-8 w-8 rounded-xl bg-brand-50 text-brand-600">
          <Cookie className="h-4 w-4" />
        </span>
        <p className="font-semibold text-ink text-sm">Cookies, kept minimal</p>
      </div>
      <p className="text-[13px] text-ink-soft leading-relaxed mb-4">
        We use one strictly-necessary session cookie and zero trackers. Preferences stay on your
        device. Details in the <Link href="/legal/cookies" className="font-semibold text-brand-700 hover:text-brand-800">Cookie Policy</Link>.
      </p>
      <div className="flex gap-2">
        <button onClick={() => choose("all")} className="btn-primary flex-1 !py-2 text-[13px]">
          Accept all
        </button>
        <button onClick={() => choose("essential")} className="btn-outline flex-1 !py-2 text-[13px]">
          Essential only
        </button>
      </div>
    </div>
  );
}
