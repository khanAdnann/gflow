import { motion } from "framer-motion";
import { Clapperboard, Sparkles } from "lucide-react";
import { REWARD_LABEL } from "../types/referral";

const sparkles = [
  { top: "8%", left: "10%", d: 0 }, { top: "18%", left: "88%", d: 0.6 },
  { top: "78%", left: "6%", d: 1.2 }, { top: "86%", left: "84%", d: 1.8 },
  { top: "48%", left: "96%", d: 0.9 },
];

export function RewardCard({ label = "SIMULATED AI CREDITS", className = "" }: { label?: string; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`relative mx-auto w-full max-w-xl ${className}`}
    >
      {/* animated glowing border */}
      <div className="absolute -inset-[2px] overflow-hidden rounded-[2rem]" aria-hidden>
        <div className="absolute left-1/2 top-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2 animate-spin360 bg-[conic-gradient(from_0deg,#2f7bff,#8b5cf6,#d946ef,#2f7bff)]" />
      </div>
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-r from-electric-500/30 to-violet-500/30 blur-3xl" aria-hidden />

      <div className="relative overflow-hidden rounded-[2rem] bg-white px-6 py-12 text-center dark:bg-ink-900 sm:px-10 sm:py-14">
        {sparkles.map((s, i) => (
          <motion.span
            key={i} aria-hidden style={{ top: s.top, left: s.left }}
            className="absolute text-violet-400"
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], rotate: [0, 90, 180] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: s.d }}
          >
            <Sparkles className="h-5 w-5" />
          </motion.span>
        ))}

        <motion.div
          animate={{ y: [0, -6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-electric-500 to-violet-500 shadow-glow"
        >
          <Clapperboard className="h-8 w-8 text-white" aria-label="AI video creation" />
        </motion.div>

        <p className="gradient-text font-display text-6xl font-bold leading-none tracking-tight sm:text-7xl">{REWARD_LABEL}</p>
        <p className="mt-4 font-display text-sm font-bold tracking-[0.3em] text-slate-600 dark:text-slate-300 sm:text-base">{label}</p>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Demo reward only — not redeemable for actual credits.</p>
      </div>
    </motion.div>
  );
}
