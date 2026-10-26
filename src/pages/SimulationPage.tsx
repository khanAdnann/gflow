import { useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, RotateCcw } from "lucide-react";
import { ReferralProgress } from "../components/ReferralProgress";
import { ReferralSlots } from "../components/ReferralSlots";
import { Confetti } from "../components/Confetti";
import { advanceSimulation, loadSimulation, resetSimulation } from "../lib/simulation";
import { TARGET_REFERRALS, type ReferralSlot } from "../types/referral";

/**
 * Local-only simulation. Nothing here talks to the backend, and its storage key is
 * separate from real participant data, so it can never count as verified referrals.
 */
export default function SimulationPage() {
  const [sim, setSim] = useState(loadSimulation);
  const done = sim.simulated >= TARGET_REFERRALS;
  const slots: ReferralSlot[] = Array.from({ length: TARGET_REFERRALS }, (_, i) => ({
    slot: i + 1, status: i < sim.simulated ? "verified" : "pending",
  }));

  return (
    <div className="space-y-8">
      <div role="note" className="flex items-start gap-3 rounded-2xl border border-amber-400/50 bg-amber-400/10 p-4">
        <FlaskConical className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" aria-hidden />
        <p className="text-sm">
          <strong>SIMULATION MODE.</strong> Everything on this page is fake, stored only in your browser, and is
          <strong> not</strong> connected to real referrals or the backend. Real progress lives on the{" "}
          <Link to="/challenge" className="font-semibold underline">Challenge page</Link>.
        </p>
      </div>

      <h1 className="font-display text-4xl font-bold sm:text-5xl">
        Simulated <span className="gradient-text">Challenge</span>
      </h1>

      <section className="card">
        <ReferralProgress verified={sim.simulated} target={TARGET_REFERRALS} label="simulated referrals" />
        <div className="mt-8"><ReferralSlots slots={slots} verifiedLabel="Simulated" /></div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button className="btn-primary" disabled={done} onClick={() => setSim(advanceSimulation(sim))}>
            SIMULATE A REFERRAL
          </button>
          <button className="btn-secondary" onClick={() => setSim(resetSimulation())}>
            <RotateCcw className="h-4 w-4" aria-hidden /> RESTART SIMULATION
          </button>
        </div>
      </section>

      {done && (
        <section className="card text-center" aria-live="polite">
          <Confetti count={40} />
          <h2 className="font-display text-3xl font-bold gradient-text">SIMULATION COMPLETE</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            You finished a <strong>simulated</strong> run. This is not a genuine completion and no credits —
            real or otherwise — were awarded.
          </p>
        </section>
      )}
    </div>
  );
}

