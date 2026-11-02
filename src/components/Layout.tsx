import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Particles } from "./Particles";
import { ResponsiveAdStrip } from "./AdBanner";
import { capturePendingRef } from "../lib/referral";

export function Layout() {
  const { pathname, search, hash } = useLocation();

  // Remember ?ref= codes from landing links. Capturing is NOT a referral — attribution and
  // verification happen server-side later.
  useEffect(() => { capturePendingRef(search); }, [search]);

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only z-[200] rounded bg-white p-3 text-black focus:not-sr-only focus:fixed focus:left-2 focus:top-2">
        Skip to content
      </a>
      <Particles />
      <Header />
      <ResponsiveAdStrip className="mt-4" />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 sm:pt-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
