"use client";

import { useEffect, useState } from "react";
import { clsx } from "@/lib/format";
import { Moon, Sun } from "lucide-react";

const KEY = "prive-theme";

export function applyTheme(theme: "light" | "dark"): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
}

// Sun/moon toggle. The saved choice is applied pre-hydration by the inline
// script in app/layout.tsx, so there is no flash of the wrong theme.
export function ThemeToggle({ dark = false }: { dark?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={clsx(
        "grid place-items-center h-9 w-9 rounded-xl border transition-colors",
        dark
          ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
          : "border-line text-ink-faint hover:text-ink hover:border-line-strong",
      )}
    >
      {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
