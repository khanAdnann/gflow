import { Link, NavLink } from "react-router-dom";
import { Moon, Sparkles, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/#how-it-works", label: "How It Works", hash: true },
  { to: "/about", label: "About" },
];

export function Header() {
  const { theme, toggle } = useTheme();
  const cls = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-2 text-sm font-medium transition hover:text-electric-400 ${
      isActive ? "text-electric-400" : "text-slate-600 dark:text-slate-300"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-ink-950/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-base font-bold tracking-wider" aria-label="AI Credits — home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-electric-500 to-violet-500 shadow-glow">
            <Sparkles className="h-5 w-5 text-white" aria-hidden />
          </span>
          <span className="hidden sm:inline">AI <span className="gradient-text">CREDITS</span></span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-0.5 sm:gap-1">
          {links.map((l) =>
            l.hash ? (
              <a key={l.to} href={l.to} className="rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-electric-400 dark:text-slate-300">
                {l.label}
              </a>
            ) : (
              <NavLink key={l.to} to={l.to} end={l.end} className={cls}>{l.label}</NavLink>
            ),
          )}
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="ml-1 grid h-10 w-10 place-items-center rounded-full border border-slate-300 transition hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>
      </div>
    </header>
  );
}

