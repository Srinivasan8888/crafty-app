"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  // The real theme lives in localStorage / the <html> class the pre-paint
  // bootstrap set — neither is knowable at SSR. Rather than render the wrong
  // icon for dark-mode users until the effect runs (the old bug), we render a
  // neutral placeholder until mounted. Server and first client render match
  // (mounted=false), so there's no hydration mismatch and never a wrong icon.
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initial = stored ?? prefers;
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost btn-sm"
      aria-label={mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Toggle theme"}
      title="Toggle theme"
    >
      {mounted ? (
        theme === "dark" ? <Sun size={16} /> : <Moon size={16} />
      ) : (
        <span style={{ display: "inline-block", width: 16, height: 16 }} aria-hidden="true" />
      )}
    </button>
  );
}
