import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "../lib/api";
import { clearPendingRef, getPendingRef } from "../lib/referral";
import { isConfigured } from "../lib/config";
import { ensureParticipant } from "../lib/supabase";

export type LoadState = "idle" | "loading" | "ready" | "error";

/** Codes the server rejected definitively — no point retrying them. */
const FINAL_REJECTIONS = new Set(["invalid_code", "self_referral", "not_eligible", "rejected"]);

/**
 * Establishes the participant, applies a pending ?ref= attribution (server-validated),
 * then loads (or creates) the participant's own referral code and URL.
 */
export function useReferral() {
  const [state, setState] = useState<LoadState>(isConfigured ? "loading" : "idle");
  const [code, setCode] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attributionNotice, setAttributionNotice] =
    useState<{ kind: "success" | "error"; message: string } | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    if (!isConfigured) return;
    setState("loading");
    setError(null);
    try {
      await ensureParticipant();

      const pending = getPendingRef();
      if (pending) {
        try {
          const res = await api.attributeReferral(pending);
          clearPendingRef();
          setAttributionNotice({
            kind: "success",
            message: res.result === "attributed"
              ? "You joined through a friend's link. Confirm your participation below to count as their verified referral."
              : "Your referral link was already applied earlier.",
          });
        } catch (e) {
          if (e instanceof ApiError && FINAL_REJECTIONS.has(e.code)) {
            clearPendingRef();
            setAttributionNotice({ kind: "error", message: e.message });
          } else {
            throw e;
          }
        }
      }

      const res = await api.createReferralCode();
      setCode(res.code);
      setUrl(res.referralUrl);
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (started.current) return; // avoid double-run in StrictMode
    started.current = true;
    void run();
  }, [run]);

  return { state, code, url, error, attributionNotice, retry: run };
}

