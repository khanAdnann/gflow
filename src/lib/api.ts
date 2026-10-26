import { FunctionsHttpError } from "@supabase/supabase-js";
import { ensureParticipant, supabase } from "./supabase";
import type {
  ChallengeProgress, ChallengeStatus, ReferralCodeResponse,
} from "../types/referral";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0) {
    super(message);
  }
}

async function call<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new ApiError("not_configured", "Supabase is not configured.");
  await ensureParticipant();
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      const payload = await res.json().catch(() => null);
      throw new ApiError(
        payload?.error?.code ?? "request_failed",
        payload?.error?.message ?? "The request failed.",
        res.status,
      );
    }
    throw new ApiError("network", "Could not reach the server. Check your connection and try again.");
  }
  return data as T;
}

export const api = {
  createReferralCode: () => call<ReferralCodeResponse>("create-referral-code"),
  attributeReferral: (code: string) => call<{ result: string }>("attribute-referral", { code }),
  verifyReferral: (acknowledged: boolean) => call<{ result: string }>("verify-referral", { acknowledged }),
  getProgress: () => call<ChallengeProgress>("get-challenge-progress"),
  getStatus: () => call<ChallengeStatus>("get-challenge-status"),
};

