import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ChallengeProgress } from "../types/referral";
import type { LoadState } from "./useReferral";

/** Server-authoritative progress. Refreshes on focus and every 20s while visible. */
export function useChallengeProgress(enabled: boolean) {
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setState("loading");
    try {
      setProgress(await api.getProgress());
      setError(null);
      setState("ready");
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Could not load progress.");
        setState("error");
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const tick = () => { if (document.visibilityState === "visible") void refresh(true); };
    const id = window.setInterval(tick, 20_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [enabled, refresh]);

  return { progress, state, error, refresh };
}

