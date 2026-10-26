export const DISCLAIMER_SHORT = "Unofficial interactive demo. No real Google Flow credits are issued.";

export function buildShareMessage(url: string): string {
  return `I'm trying this unofficial AI Credits Challenge demo. Join using my referral link: ${url}. This is a simulation; no real Google Flow credits are awarded.`;
}

export const whatsappUrl = (url: string) =>
  `https://wa.me/?text=${encodeURIComponent(buildShareMessage(url))}`;

export const telegramUrl = (url: string) =>
  `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(buildShareMessage(url))}`;

export const facebookUrl = (url: string) =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** Opens the native share sheet. Returns false if cancelled/unsupported. Never counts as a referral. */
export async function nativeShare(url: string): Promise<boolean> {
  if (!canNativeShare()) return false;
  try {
    await navigator.share({
      title: "AI Credits Challenge Demo",
      text: buildShareMessage(url),
      url,
    });
    return true;
  } catch {
    return false; // user dismissed the sheet
  }
}

export function openShareWindow(href: string): void {
  window.open(href, "_blank", "noopener,noreferrer");
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to legacy path */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
