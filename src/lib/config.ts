const required = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
};

export function getMissingConfig(values: Record<string, string | undefined> = required): string[] {
  return Object.entries(values)
    .filter(([, v]) => !v || !v.trim() || v.includes("YOUR-"))
    .map(([k]) => k);
}

export const config = {
  supabaseUrl: required.VITE_SUPABASE_URL?.trim() ?? "",
  supabaseKey: required.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
  /** Public origin used to build referral links. Falls back to the current origin. */
  appUrl: (
    (import.meta.env.VITE_APP_URL as string | undefined)?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, ""),
  missing: getMissingConfig(),
};

export const isConfigured = config.missing.length === 0;

