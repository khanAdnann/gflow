import { CODE_REGEX, fail, handler, json } from "../_shared/mod.ts";

// Function B — attribute the caller (a new participant) to a referral code.
// Does NOT verify anything; it only records a 'pending' referral.
Deno.serve(handler(async ({ req, admin, user, body }) => {
  const raw = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!CODE_REGEX.test(raw)) return fail(req, 400, "invalid_code", "That referral code is not valid.");

  const { data, error } = await admin.rpc("attribute_referral", { p_code: raw, p_user: user.id });
  if (error) throw error;

  switch (data?.result) {
    case "attributed":
      return json(req, { result: "attributed" });
    case "already_attributed":
      // Repeat visits are idempotent and never create a second referral.
      return json(req, { result: "already_attributed" });
    case "invalid_code":
      return fail(req, 404, "invalid_code", "That referral code is not valid.");
    case "self_referral":
      return fail(req, 400, "self_referral", "You can't use your own referral link.");
    case "not_eligible":
      return fail(req, 403, "not_eligible", "Referrals only apply to newly started participants.");
    default:
      return fail(req, 400, "rejected", "This referral could not be applied.");
  }
}, { name: "attribute-referral", limit: { max: 10, windowSeconds: 60 } }));

