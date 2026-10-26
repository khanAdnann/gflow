import { Link } from "react-router-dom";
import { DISCLAIMER_SHORT } from "../lib/sharing";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-200/70 py-10 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:text-left">
        <p className="max-w-md">
          <strong className="font-semibold text-slate-700 dark:text-slate-200">{DISCLAIMER_SHORT}</strong>{" "}
          Not affiliated with or endorsed by Google.
        </p>
        <nav aria-label="Footer" className="flex gap-5">
          <Link className="hover:text-electric-400" to="/about">About</Link>
          <Link className="hover:text-electric-400" to="/privacy">Privacy</Link>
          <Link className="hover:text-electric-400" to="/demo">Simulation</Link>
        </nav>
      </div>
    </footer>
  );
}

