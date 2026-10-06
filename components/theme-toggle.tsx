"use client";
import { useEffect, useState } from "react";
import { Moon, Monitor, Sun } from "lucide-react";

const ORDER = ["dark", "light", "system"] as const;
type Theme = (typeof ORDER)[number];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("gt-theme") as Theme | null;
      if (saved && ORDER.includes(saved)) setTheme(saved);
    } catch {}
  }, []);

  function next() {
    const t = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]!;
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("gt-theme", t); } catch {}
  }
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <button onClick={next} aria-label={`Theme: ${theme}. Click to change`} className="rounded-lg p-2 text-muted hover:bg-surface2 hover:text-fg">
      <Icon size={18} />
    </button>
  );
}
