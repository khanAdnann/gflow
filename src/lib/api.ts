import { FunctionsHttpError } from "@supabase/supabase-js";
import { ensureParticipant, supabase } from "./supabase";
import { buildReferralUrl } from "./referral";
import type {
  ChallengeProgress, ChallengeStatus, ReferralCodeResponse,
} from "../types/referral";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0) {
    super(message);
  }
}

async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown> | undefined,
  rpcFallback: () => Promise<T>,
): Promise<T> {
  if (!supabase) throw new ApiError("not_configured", "Supabase is not configured.");
  await ensureParticipant();
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (!error) return data as T;

  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    if (res.status === 404) {
      // Edge Function not deployed yet; fall back to the SECURITY DEFINER SQL RPC
      return await rpcFallback();
    }
    const payload = await res.json().catch(() => null);
    throw new ApiError(
      payload?.error?.code ?? "request_failed",
      payload?.error?.message ?? "The request failed.",
      res.status,
    );
  }
  // Network/Relay error when Edge Function isn't deployed on the project
  return await rpcFallback();
}

export const api = {
  createReferralCode: () =>
    invokeFunction<ReferralCodeResponse>("create-referral-code", undefined, async () => {
      const { data, error } = await supabase!.rpc("rpc_create_referral_code");
      if (error || !data?.code) {
        throw new ApiError("internal_error", "Could not create a referral code. Make sure all SQL migrations have been run in Supabase.");
      }
      return { code: data.code, referralUrl: buildReferralUrl(data.code) };
    }),

  attributeReferral: (code: string) =>
    invokeFunction<{ result: string }>("attribute-referral", { code }, async () => {
      const { data, error } = await supabase!.rpc("rpc_attribute_referral", { p_code: code });
      if (error) throw new ApiError("request_failed", "Could not apply referral code.");
      const result = String(data?.result ?? "rejected");
      if (result === "attributed" || result === "already_attributed") return { result };
      const messages: Record<string, [number, string]> = {
        invalid_code: [404, "That referral code is not valid."],
        self_referral: [400, "You can't use your own referral link."],
        not_eligible: [403, "Referrals only apply to newly started participants."],
        rate_limited: [429, "Too many requests. Please try again shortly."],
      };
      const [status, msg] = messages[result] ?? [400, "This referral could not be applied."];
      throw new ApiError(result, msg, status);
    }),

  verifyReferral: (acknowledged: boolean) =>
    invokeFunction<{ result: string }>("verify-referral", { acknowledged }, async () => {
      const { data, error } = await supabase!.rpc("rpc_verify_referral", { p_acknowledged: acknowledged });
      if (error) throw new ApiError("request_failed", "Verification failed.");
      const result = String(data?.result ?? "rejected");
      if (result === "verified") return { result: "verified" };
      const messages: Record<string, [number, string]> = {
        no_referral: [404, "No pending referral found for you."],
        already_verified: [409, "Your participation is already verified."],
        not_eligible: [403, "This referral is not eligible for verification."],
        acknowledgement_required: [400, "Please confirm you understand this is a simulated demo."],
        onboarding_incomplete: [409, "Open the challenge page and generate your own referral link first."],
        too_early: [429, "Please explore the demo for a few more seconds, then try again."],
        rate_limited: [429, "Too many requests. Please try again shortly."],
      };
      const [status, msg] = messages[result] ?? [400, "Verification failed."];
      throw new ApiError(result, msg, status);
    }),

  getProgress: () =>
    invokeFunction<ChallengeProgress>("get-challenge-progress", undefined, async () => {
      const { data, error } = await supabase!.rpc("rpc_get_challenge_progress");
      if (error || !data) throw new ApiError("request_failed", "Could not load challenge progress.");
      return data as ChallengeProgress;
    }),

  getStatus: () =>
    invokeFunction<ChallengeStatus>("get-challenge-status", undefined, async () => {
      const { data, error } = await supabase!.rpc("rpc_get_challenge_status");
      if (error || !data) throw new ApiError("request_failed", "Could not verify challenge status.");
      return data as ChallengeStatus;
    }),
};
