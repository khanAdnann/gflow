import { TARGET_REFERRALS } from "../types/referral";

/**
 * Local simulation. Stored under a DIFFERENT key and never sent to or read from the
 * backend, so simulated progress can't be mistaken for genuine verified referrals.
 */
const KEY = "acd-simulation-v1";

export interface SimulationState { simulated: number }

export function loadSimulation(): SimulationState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    const n = Number(raw?.simulated);
    if (Number.isInteger(n) && n >= 0 && n <= TARGET_REFERRALS) return { simulated: n };
  } catch { /* ignore corrupt data */ }
  return { simulated: 0 };
}

export function advanceSimulation(state: SimulationState): SimulationState {
  const next = { simulated: Math.min(TARGET_REFERRALS, state.simulated + 1) };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function resetSimulation(): SimulationState {
  localStorage.removeItem(KEY);
  return { simulated: 0 };
}

