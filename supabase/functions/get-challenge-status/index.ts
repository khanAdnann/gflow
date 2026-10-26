import { handler, json } from "../_shared/mod.ts";

// Function E — server-calculated completion status used to gate /success.
// Recomputes from verified referral rows; the client can't influence the result.
Deno.serve(handler(async ({ req, admin, user }) => {
  const { data, error } = await admin.rpc("complete_challenge_if_eligible", { p_owner: user.id });
  if (error) throw error;
  return json(req, {
    completed: data.completed === true,
    verified: data.verified,
    target: data.target,
    completedAt: data.completedAt,
  });
}, { name: "get-challenge-status", limit: { max: 60, windowSeconds: 60 } }));

