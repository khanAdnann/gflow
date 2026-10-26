import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Share2 } from "lucide-react";
import { Confetti } from "../components/Confetti";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { ConfigError } from "../components/ConfigError";
import { RewardCard } from "../components/RewardCard";
import { ReferralSlots } from "../components/ReferralSlots";
import { useToast } from "../components/Toast";
import { api } from "../lib/api";
import { config, isConfigured } from "../lib/config";
import { canNativeShare, copyText, nativeShare } from "../lib/sharing";
import { TARGET_REFERRALS, type ReferralSlot } from "../types/referral";

type View = { s: "loading" } | { s: "error"; message: string } | { s: "incomplete" } | { s: "done"; verified: number };

const COMPLETED_SLOTS: ReferralSlot[] = Array.from({ length: TARGET_REFERRALS }, (_, i) => ({
  slot: i + 1,
  status: "verified",
}));

export default function SuccessPage() {
  if (!isConfigured) return <ConfigError />;
  return <SuccessInner />;
}

function SuccessInner() {
  const toast = useToast();
  const [view, setView] = useState<View>({ s: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setView({ s: "loading" });
    api.getStatus()
      .then((r) => alive && setView(r.completed ? { s: "done", verified: r.verified } : { s: "incomplete" }))
      .catch((e) => alive && setView({ s: "error", message: e instanceof Error ? e.message : "Could not check status." }));
    return () => { alive = false; };
  }, [attempt]);

  // Server decides. Direct navigation without 5 verified referrals bounces back.
  if (view.s === "incomplete") return <Navigate to="/challenge" replace />;
  if (view.s === "loading") return <LoadingState rows={2} label="Checking your challenge status" />;
  if (view.s === "error") return <ErrorState message={view.message} onRetry={() => setAttempt((n) => n + 1)} />;

  const shareAchievement = async () => {
    const url = config.appUrl;
    if (canNativeShare()) { await nativeShare(url); return; }
    toast.show((await copyText(url)) ? "Achievement link copied to clipboard!" : "Couldn't copy the link.", "info");
  };

  return (
    <div className="relative text-center">
      <Confetti />
      <motion.div
        initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 12 }}
        className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-electric-500 shadow-glow"
      >
        <CheckCircle2 className="h-14 w-14 text-white" aria-hidden />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="mt-8 font-display text-4xl font-bold sm:text-6xl"
      >
        <span className="gradient-text">Challenge Completed!</span>
      </motion.h1>
      <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">
        You've completed the five-referral demo challenge.
      </p>
      <div className="mt-10">
        <RewardCard />
      </div>

      <div className="card mx-auto mt-8 max-w-xl text-left">
        <p className="mb-4 text-center font-display text-lg font-bold text-emerald-400">
          5/5 Verified Referrals Confirmed ✓
        </p>
        <ReferralSlots slots={COMPLETED_SLOTS} />
      </div>

      <p className="mx-auto mt-6 max-w-lg rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-3 text-sm font-medium text-amber-700 dark:text-amber-200">
        These are simulated demo credits. No actual Google Flow credits have been awarded.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <button className="btn-primary" onClick={shareAchievement}>
          <Share2 className="h-4 w-4" aria-hidden /> SHARE ACHIEVEMENT
        </button>
        <Link to="/" className="btn-secondary">RETURN HOME</Link>
        <Link to="/challenge" className="btn-secondary">VIEW MY PROGRESS</Link>
      </div>
    </div>
  );
}
