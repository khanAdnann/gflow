import { fail, generateCode, handler, json, referralUrl } from "../_shared/mod.ts";

// Function A — create (or return) the caller's referral code.
// Identity comes solely from the verified JWT; the request body is ignored.
Deno.serve(handler(async ({ req, admin, user }) => {
  const read = () =>
    admin.from("referral_codes").select("code").eq("owner_id", user.id).eq("active", true).maybeSingle();

  let { data, error } = await read();
  if (error) throw error;

  for (let attempt = 0; !data && attempt < 5; attempt++) {
    const ins = await admin.from("referral_codes").insert({ owner_id: user.id, code: generateCode() });
    // 23505 = unique violation (code collision, or concurrent request already created one).
    if (ins.error && ins.error.code !== "23505") throw ins.error;
    ({ data, error } = await read());
    if (error) throw error;
  }
  if (!data) return fail(req, 500, "internal_error", "Could not create a referral code.");

  return json(req, { code: data.code, referralUrl: referralUrl(req, data.code) });
}, { name: "create-referral-code", limit: { max: 20, windowSeconds: 60 } }));

