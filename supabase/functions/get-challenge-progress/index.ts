import { handler, json } from "../_shared/mod.ts";

// Function D — authoritative progress for the caller only.
Deno.serve(handler(async ({ req, admin, user }) => {
  const [progress, attribution] = await Promise.all([
    admin.rpc("get_challenge_progress", { p_owner: user.id }),
    admin.rpc("get_attribution_status", { p_user: user.id }),
  ]);
  if (progress.error) throw progress.error;
  if (attribution.error) throw attribution.error;

  return json(req, {
    ...progress.data,
    // The caller's own status as a referred participant (null if not referred).
    myAttribution: attribution.data ?? null,
  });
}, { name: "get-challenge-progress", limit: { max: 60, windowSeconds: 60 } }));

