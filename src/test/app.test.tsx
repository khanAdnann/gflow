import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { buildReferralUrl, capturePendingRef, clearPendingRef, getPendingRef, normalizeCode } from "../lib/referral";
import { buildShareMessage, copyText, telegramUrl, whatsappUrl } from "../lib/sharing";
import { advanceSimulation, loadSimulation, resetSimulation } from "../lib/simulation";
import { getMissingConfig } from "../lib/config";
import { ReferralSlots } from "../components/ReferralSlots";
import ChallengePage from "../pages/ChallengePage";
import SuccessPage from "../pages/SuccessPage";
import HomePage from "../pages/HomePage";

beforeEach(() => localStorage.clear());

describe("referral codes & URLs", () => {
  it("builds URLs containing the exact code on the configured domain", () => {
    expect(buildReferralUrl("ABCDEFGH23", "https://demo.vercel.app/")).toBe("https://demo.vercel.app/?ref=ABCDEFGH23");
  });
  it("rejects malformed / ambiguous codes", () => {
    expect(normalizeCode("abcdefgh23")).toBe("ABCDEFGH23");
    for (const bad of ["", "short", "ABCDEFGHI0", "<script>12", "ABCDEFGH23X", null, undefined]) {
      expect(normalizeCode(bad as string)).toBeNull();
    }
  });
  it("stores only valid ?ref values", () => {
    expect(capturePendingRef("?ref=bad")).toBeNull();
    expect(getPendingRef()).toBeNull();
    expect(capturePendingRef("?ref=ABCDEFGH23")).toBe("ABCDEFGH23");
    expect(getPendingRef()).toBe("ABCDEFGH23");
    clearPendingRef();
    expect(getPendingRef()).toBeNull();
  });
});

describe("sharing", () => {
  const url = "https://demo.vercel.app/?ref=ABCDEFGH23";
  it("WhatsApp link carries the full prefilled message with the referral URL", () => {
    const href = whatsappUrl(url);
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    const text = decodeURIComponent(href.split("text=")[1]);
    expect(text).toBe(buildShareMessage(url));
    expect(text).toContain(url);
    expect(text).toContain("Unofficial demo — no real credits are issued.");
  });
  it("Telegram link carries url and text", () => {
    const u = new URL(telegramUrl(url));
    expect(u.searchParams.get("url")).toBe(url);
    expect(u.searchParams.get("text")).toContain("interactive AI credits demo");
  });
  it("copyText uses the clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    expect(await copyText(url)).toBe(true);
    expect(writeText).toHaveBeenCalledWith(url);
  });
  it("copyText falls back to execCommand", async () => {
    Object.assign(navigator, { clipboard: undefined });
    document.execCommand = vi.fn().mockReturnValue(true);
    expect(await copyText(url)).toBe(true);
  });
});

describe("simulation is isolated", () => {
  it("advances, caps at 5, resets, and uses its own storage key", () => {
    let s = loadSimulation();
    for (let i = 0; i < 8; i++) s = advanceSimulation(s);
    expect(s.simulated).toBe(5);
    expect(Object.keys(localStorage)).toEqual(["acd-simulation-v1"]);
    expect(getPendingRef()).toBeNull();
    expect(resetSimulation().simulated).toBe(0);
    expect(loadSimulation().simulated).toBe(0);
  });
  it("ignores corrupted storage", () => {
    localStorage.setItem("acd-simulation-v1", JSON.stringify({ simulated: 999 }));
    expect(loadSimulation().simulated).toBe(0);
  });
});

describe("configuration", () => {
  it("reports missing/placeholder variables", () => {
    expect(getMissingConfig({ A: "", B: "ok", C: "https://YOUR-PROJECT.supabase.co" })).toEqual(["A", "C"]);
  });
  it("shows a helpful error on /challenge and /success without Supabase config", () => {
    for (const Page of [ChallengePage, SuccessPage]) {
      const { unmount } = render(<MemoryRouter><Page /></MemoryRouter>);
      expect(screen.getByRole("alert")).toHaveTextContent(/VITE_SUPABASE_URL/);
      unmount();
    }
  });
});

describe("UI", () => {
  it("landing page renders headline and CTAs", () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1,00,000 AI Credits?");
    expect(screen.getByRole("button", { name: /START THE CHALLENGE/ })).toBeInTheDocument();
    expect(screen.getAllByText(/simulated/i).length).toBeGreaterThan(0);
  });
  it("renders five slots with pending/verified states", () => {
    const slots = [1, 2, 3, 4, 5].map((n) => ({ slot: n, status: n <= 2 ? "verified" as const : "pending" as const }));
    render(<ReferralSlots slots={slots} />);
    expect(screen.getAllByText("Verified")).toHaveLength(2);
    expect(screen.getAllByText("Pending")).toHaveLength(3);
  });
});

