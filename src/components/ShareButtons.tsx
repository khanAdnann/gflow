import { Copy, Users, Send, Share2, MessageCircle } from "lucide-react";
import { useToast } from "./Toast";
import {
  canNativeShare, copyText, facebookUrl, nativeShare, openShareWindow, telegramUrl, whatsappUrl,
} from "../lib/sharing";

/**
 * Sharing only opens a share UI. It never changes referral counts — those come
 * exclusively from backend verification.
 */
export function ShareButtons({ url }: { url: string | null }) {
  const toast = useToast();
  const disabled = !url;

  const copy = async () => {
    if (!url) return;
    (await copyText(url))
      ? toast.show("Referral link copied successfully!")
      : toast.show("Couldn't copy automatically. Select the link above and copy it manually.", "error");
  };

  const share = async () => {
    if (!url) return;
    if (canNativeShare()) { await nativeShare(url); return; }
    // Fallback: no Web Share API — offer copy + platform links.
    await copy();
    toast.show("Sharing isn't supported in this browser. Use the WhatsApp, Telegram or Facebook buttons.", "info");
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <button className="btn-primary" disabled={disabled} onClick={share}>
          <Share2 className="h-4 w-4" aria-hidden /> SHARE WITH FRIENDS
        </button>
        <button className="btn-secondary" disabled={disabled} onClick={copy}>
          <Copy className="h-4 w-4" aria-hidden /> COPY REFERRAL LINK
        </button>
        <button className="btn-secondary" disabled={disabled} onClick={() => url && openShareWindow(whatsappUrl(url))}>
          <MessageCircle className="h-4 w-4" aria-hidden /> SHARE ON WHATSAPP
        </button>
        <button className="btn-secondary" disabled={disabled} onClick={() => url && openShareWindow(telegramUrl(url))}>
          <Send className="h-4 w-4" aria-hidden /> SHARE ON TELEGRAM
        </button>
      </div>
      <button className="btn-secondary w-full" disabled={disabled} onClick={() => url && openShareWindow(facebookUrl(url))}>
        <Users className="h-4 w-4" aria-hidden /> SHARE ON FACEBOOK
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Opening a share window doesn't count as a referral. Only friends who open your link and complete the
        verified onboarding step are counted by the server.
      </p>
    </div>
  );
}
