import { Link } from "react-router-dom";
import { DISCLAIMER_SHORT } from "../lib/sharing";
import { AdBanner, NativeBanner, ResponsiveAdStrip, SMARTLINK_URL } from "./AdBanner";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200/70 py-10 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
      <div className="mx-auto max-w-6xl px-4">
        <NativeBanner />
        <ResponsiveAdStrip className="mb-8" />
        <div className="mb-6 flex justify-center">
          <AdBanner adKey="48d0a8922949bc35d6c7feca666cbe35" width={160} height={300} />
        </div>
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <p className="max-w-md">
            <strong className="font-semibold text-slate-700 dark:text-slate-200">{DISCLAIMER_SHORT}</strong>{" "}
            Not affiliated with or endorsed by Google.
          </p>
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-5">
            <a className="font-semibold text-electric-400 hover:underline" href={SMARTLINK_URL} target="_blank" rel="noopener noreferrer">
              Featured Offer
            </a>
            <Link className="hover:text-electric-400" to="/about">About</Link>
            <Link className="hover:text-electric-400" to="/privacy">Privacy</Link>
            <Link className="hover:text-electric-400" to="/demo">Simulation</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
