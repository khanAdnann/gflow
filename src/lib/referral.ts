import { config } from "./config";

const PENDING_KEY = "acd-pending-ref";
/** Mirrors the server-side alphabet: no I, L, O, 0, 1. */
const CODE_REGEX = /^[A-HJ-KM-NP-Z2-9]{10}$/;

export function normalizeCode(input: string | null | undefined): string | null {
  const code = (input ?? "").trim().toUpperCase();
  return CODE_REGEX.test(code) ? code : null;
}

export function buildReferralUrl(code: string, base: string = config.appUrl): string {
  return `${base.replace(/\/$/, "")}/?ref=${encodeURIComponent(code)}`;
}

/** Remember a ?ref= code from the URL so it survives navigation. Returns the stored code. */
export function capturePendingRef(search: string): string | null {
  const code = normalizeCode(new URLSearchParams(search).get("ref"));
  if (code) localStorage.setItem(PENDING_KEY, code);
  return code;
}

export const getPendingRef = (): string | null => normalizeCode(localStorage.getItem(PENDING_KEY));
export const clearPendingRef = (): void => localStorage.removeItem(PENDING_KEY);

