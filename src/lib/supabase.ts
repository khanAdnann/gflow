import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, isConfigured } from "./config";

/** Browser client. Uses ONLY the publishable (anon) key — never a service-role key. */
export const supabase: SupabaseClient | null = isConfigured
  ? createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

/**
 * Ensures the visitor has a server-issued anonymous participant identity (JWT).
 * The session persists in localStorage, which gives persistent progress.
 */
export async function ensureParticipant(): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: created, error } = await supabase.auth.signInAnonymously();
  if (error || !created.user) {
    const detail = error?.message ? ` (${error.message})` : "";
    throw new Error(
      `Could not start a participant session${detail}. In your Supabase Dashboard, go to Authentication → Sign In / Providers and enable "Allow anonymous sign-ins".`,
    );
  }
  return created.user.id;
}

