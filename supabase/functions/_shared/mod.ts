// Shared helpers for all Edge Functions.
import { createClient, SupabaseClient, User } from "npm:@supabase/supabase-js@2";

const DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"];

function allowedOrigins(): string[] {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
  return configured.length ? configured : DEV_ORIGINS;
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (allowedOrigins().includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function fail(req: Request, status: number, code: string, message: string): Response {
  return json(req, { error: { code, message } }, status);
}

/** Service-role client. Lives ONLY in the Edge Function environment. */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Verifies the caller's JWT with Supabase Auth. The returned user id is the ONLY identity we trust. */
export async function authenticate(req: Request, admin: SupabaseClient): Promise<User | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  const { data, error } = await admin.auth.getUser(match[1]);
  if (error || !data.user) return null;
  return data.user;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hashed client IP (never stored raw). */
export async function clientFingerprint(req: Request): Promise<string> {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  return (await sha256Hex(`ip:${ip}`)).slice(0, 32);
}

/** Returns true when the request is within limits. Fails closed on DB errors. */
export async function rateLimit(
  admin: SupabaseClient, key: string, max: number, windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key, p_max: max, p_window_seconds: windowSeconds,
  });
  if (error) return false;
  return data === true;
}

/**
 * Wraps a POST-only handler with CORS preflight, method check, JSON parsing,
 * authentication and an error boundary that never leaks internals.
 */
export function handler(
  fn: (ctx: {
    req: Request; admin: SupabaseClient; user: User; body: Record<string, unknown>;
  }) => Promise<Response>,
  opts: { limit: { max: number; windowSeconds: number }; name: string },
) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
    if (req.method !== "POST") return fail(req, 405, "method_not_allowed", "Use POST.");
    try {
      const admin = adminClient();
      const user = await authenticate(req, admin);
      if (!user) return fail(req, 401, "unauthorized", "Please sign in to continue.");

      const ip = await clientFingerprint(req);
      const okUser = await rateLimit(admin, `${opts.name}:u:${user.id}`, opts.limit.max, opts.limit.windowSeconds);
      const okIp = await rateLimit(admin, `${opts.name}:ip:${ip}`, opts.limit.max * 5, opts.limit.windowSeconds);
      if (!okUser || !okIp) return fail(req, 429, "rate_limited", "Too many requests. Please try again shortly.");

      let body: Record<string, unknown> = {};
      const text = await req.text();
      if (text.length > 2048) return fail(req, 413, "payload_too_large", "Request too large.");
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
          body = parsed;
        } catch {
          return fail(req, 400, "invalid_json", "Request body must be a JSON object.");
        }
      }
      return await fn({ req, admin, user, body });
    } catch (e) {
      console.error(opts.name, e);
      return fail(req, 500, "internal_error", "Something went wrong. Please try again.");
    }
  };
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 31 chars, no I/L/O/0/1
export const CODE_REGEX = /^[A-HJ-KM-NP-Z2-9]{10}$/;

/** Cryptographically secure code using rejection sampling (no modulo bias). */
export function generateCode(length = 10): string {
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let out = "";
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      if (b < limit && out.length < length) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
    }
  }
  return out;
}

export function referralUrl(req: Request, code: string): string {
  const base = (Deno.env.get("APP_URL") ?? req.headers.get("origin") ?? "http://localhost:5173").replace(/\/$/, "");
  return `${base}/?ref=${code}`;
}

