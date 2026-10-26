import { motion } from "framer-motion";
import { CheckCircle2, Clock } from "lucide-react";
import type { ReferralSlot } from "../types/referral";

interface Props { slots: ReferralSlot[]; verifiedLabel?: string }

export function ReferralSlots({ slots, verifiedLabel = "Verified" }: Props) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="Referral status">
      {slots.map((s, i) => {
        const ok = s.status === "verified";
        return (
          <motion.li
            key={s.slot}
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
              ok
                ? "border-emerald-400/40 bg-emerald-400/10"
                : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]"
            }`}
          >
            <span className="font-medium">Referral {s.slot}</span>
            <span className={`flex items-center gap-1.5 text-sm font-semibold ${ok ? "text-emerald-500" : "text-slate-500 dark:text-slate-400"}`}>
              {ok ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Clock className="h-4 w-4" aria-hidden />}
              <span aria-hidden>—</span> {ok ? verifiedLabel : "Pending"}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}

