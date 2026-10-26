import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, PartyPopper, Target, UserCheck } from "lucide-react";
import { ReferralProgress } from "../components/ReferralProgress";
import { ReferralSlots } from "../components/ReferralSlots";
import { ShareButtons } from "../components/ShareButtons";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { ConfigError } from "../components/ConfigError";
import { useToast } from "../components/Toast";
import { useReferral } from "../hooks/useReferral";
import { useChallengeProgress } from "../hooks/useChallengeProgress";
import { api, ApiError } from "../lib/api";
import { isConfigured } from "../lib/config";
import { REWARD_LABEL, TARGET_REFERRALS } from "../types/referral";

export default function ChallengePage() {
  if (!isConfigured) return <ConfigError />;
  return <ChallengeInner />;
}

function ChallengeInner() {
  const toast = useToast();
  const referral = useReferral();
  const { progress, state, error, refresh } = useChallengeProgress(referral.state === "ready");
  const [ack, setAck] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const confirm = async () => {
    setVerifying(true);
    try {
      await api.verifyReferral(ack);
      toast.show("Your participation was verified. Thank you!");
      await refresh(true);
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Verification failed.", "error");
    } finally {
      setVerifying(false);
    }
  };

  if (referral.state === "error") {
    return <ErrorState message={referral.error ?? "Could not start your session."} onRetry={referral.retry} />;
  }

  return (
    <div className="space-y-8">
      <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-4xl font-bold sm:text-5xl">
          Your AI Credits <span className="gradient-text">Challenge</span>
        </h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card flex items-center gap-4 !p-5">
            <Gift className="h-8 w-8 text-violet-400" aria-hidden />
            <div>
              <p className="text-xs font-semibold tracking-widest text-slate-500 dark:text-slate-400">REWARD</p>
              <p className="font-display text-xl font-bold">{REWARD_LABEL} SIMULATED CREDITS</p>
            </div>
          </div>
          <div className="card flex items-center gap-4 !p-5">
            <Target className="h-8 w-8 text-electric-400" aria-hidden />
            <div>
              <p className="text-xs font-semibold tracking-widest text-slate-500 dark:text-slate-400">REFERRAL TARGET</p>
              <p className="font-display text-xl font-bold">{TARGET_REFERRALS} VERIFIED REFERRALS</p>
            </div>
          </div>
        </div>
      </motion.header>

      {referral.attributionNotice && (
        <p
          role={referral.attributionNotice.kind === "error" ? "alert" : "status"}
          className={`rounded-2xl border px-4 py-3 text-sm ${
            referral.attributionNotice.kind === "error"
              ? "border-rose-400/40 bg-rose-400/10"
              : "border-emerald-400/40 bg-emerald-400/10"
          }`}
        >
          {referral.attributionNotice.message}
        </p>
      )}

      <section className="card" aria-labelledby="progress-h">
        <h2 id="progress-h" className="mb-6 font-display text-2xl font-bold">Verified progress</h2>
        {state === "error" ? (
          <ErrorState message={error ?? "Could not load progress."} onRetry={() => void refresh()} />
        ) : !progress ? (
          <LoadingState rows={2} label="Loading your progress" />
        ) : (
          <div className="space-y-8">
            <ReferralProgress verified={progress.verified} target={progress.target} />
            <ReferralSlots slots={progress.slots} />
            {progress.verified === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-600 dark:border-white/15 dark:text-slate-300">
                No verified referrals yet. Share your link below — friends are counted only after the server verifies them.
                {progress.pendingAwaitingVerification > 0 &&
                  ` ${progress.pendingAwaitingVerification} friend(s) joined and haven't confirmed yet.`}
              </p>
            )}
            {progress.completed && (
              <Link to="/success" className="btn-primary w-full">
                <PartyPopper className="h-4 w-4" aria-hidden /> CHALLENGE COMPLETE — VIEW RESULT
              </Link>
            )}
          </div>
        )}
      </section>

      {progress?.myAttribution === "pending" && (
        <section className="card border-emerald-400/30" aria-labelledby="onboard-h">
          <h2 id="onboard-h" className="flex items-center gap-2 font-display text-2xl font-bold">
            <UserCheck className="h-6 w-6 text-emerald-400" aria-hidden /> Confirm your participation
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            You joined through a friend's link. Once your own referral link is ready below, confirm to count as their verified referral.
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)}
              className="mt-1 h-5 w-5 accent-violet-500"
            />
            <span className="text-sm">I understand this is an unofficial demo and the credits are simulated.</span>
          </label>
          <button className="btn-primary mt-5" disabled={!ack || verifying || referral.state !== "ready"} onClick={confirm}>
            {verifying ? "VERIFYING…" : "CONFIRM PARTICIPATION"}
          </button>
        </section>
      )}

      <section className="card" aria-labelledby="share-h">
        <h2 id="share-h" className="font-display text-2xl font-bold">Invite friends</h2>
        <label htmlFor="ref-url" className="mt-4 block text-sm font-medium">Your unique referral link</label>
        {referral.state === "ready" ? (
          <input
            id="ref-url" readOnly value={referral.url ?? ""} onFocus={(e) => e.currentTarget.select()}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white/70 px-4 py-3 font-mono text-sm dark:border-white/15 dark:bg-white/5"
          />
        ) : (
          <div className="skeleton mt-2 h-12 w-full" aria-label="Generating your link" role="status" />
        )}
        <div className="mt-5">
          <ShareButtons url={referral.url} />
        </div>
      </section>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Just want to look around? Try the <Link to="/demo" className="font-semibold text-electric-400 hover:underline">clearly-labeled simulation</Link>.
      </p>
    </div>
  );
}

