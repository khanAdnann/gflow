import { motion } from "framer-motion";

interface Props { verified: number; target: number; label?: string }

export function ReferralProgress({ verified, target, label = "verified referrals" }: Props) {
  const pct = Math.min(100, Math.round((verified / target) * 100));
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-5xl font-bold">
            <span className="gradient-text">{verified}</span>
            <span className="text-slate-400"> / {target}</span>
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">current {label} · target {target}</p>
        </div>
        <p className="font-display text-3xl font-bold" aria-hidden>{pct}%</p>
      </div>
      <div
        role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
        aria-label={`${pct}% complete — ${verified} of ${target} ${label}`}
        className="mt-5 h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-electric-500 via-violet-500 to-fuchsia-500 shadow-glow"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
      <p className="mt-2 text-sm font-medium">{pct}% complete</p>
    </div>
  );
}

