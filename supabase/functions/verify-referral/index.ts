import { fail, handler, json } from "../_shared/mod.ts";

// Function C — verify the CALLER's own pending referral after the qualifying
// onboarding action. No user id is accepted from the request: the subject is
// always the authenticated JWT user.
Deno.serve(handler(async ({ req, admin, user, body }) => {
  if (typeof body.acknowledged !== "boolean") {
    return fail(req, 400, "invalid_input", "`acknowledged` must be true or false.");
  }

  const { data, error } = await admin.rpc("verify_referral", {
    p_user: user.id, p_acknowledged: body.acknowledged,
  });
  if (error) throw error;

  const messages: Record<string, [number, string]> = {
    no_referral: [404, "No pending referral found for you."],
    already_verified: [409, "Your participation is already verified."],
    not_eligible: [403, "This referral is not eligible for verification."],
    acknowledgement_required: [400, "Please confirm you understand this is a simulated demo."],
    onboarding_incomplete: [409, "Open the challenge page and generate your own referral link first."],
    too_early: [429, "Please explore the demo for a few more seconds, then try again."],
  };
  const result = String(data?.result);
  if (result !== "verified") {
    const [status, message] = messages[result] ?? [400, "Verification failed."];
    return fail(req, status, result, message);
  }
  return json(req, { result: "verified", attribution: "verified" });
}, { name: "verify-referral", limit: { max: 10, windowSeconds: 60 } }));

