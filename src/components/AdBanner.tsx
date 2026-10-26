import { useEffect, useRef } from "react";

export const SMARTLINK_URL = "https://asiaso.org/4/25dc0e821ad1a6396f2ddc7ff4169bc5";

interface AdBannerProps {
  adKey: string;
  width: number;
  height: number;
  className?: string;
}

/**
 * Renders an Adsterra atOptions banner inside a dedicated iframe so multiple
 * banners can coexist on the same React SPA page without global variable conflicts.
 */
export function AdBanner({ adKey, width, height, className = "" }: AdBannerProps) {
  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>html,body{margin:0;padding:0;overflow:hidden;display:flex;justify-content:center;align-items:center;background:transparent;}</style>
</head>
<body>
<script type="text/javascript">
  atOptions = {
    'key' : '${adKey}',
    'format' : 'iframe',
    'height' : ${height},
    'width' : ${width},
    'params' : {}
  };
</script>
<script type="text/javascript" src="https://brijmohan.org/22/${adKey}"></script>
</body>
</html>`;

  return (
    <div className={`flex justify-center overflow-hidden ${className}`} aria-label="Sponsored advertisement">
      <iframe
        title={`ad-${adKey}`}
        srcDoc={srcDoc}
        width={width}
        height={height}
        scrolling="no"
        frameBorder={0}
        style={{ width: `${width}px`, height: `${height}px`, border: 0, maxWidth: "100%" }}
      />
    </div>
  );
}

/**
 * Responsive Adsterra strip: shows 728x90 on tablet/desktop and 320x50 on mobile.
 */
export function ResponsiveAdStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`my-6 flex flex-col items-center gap-3 ${className}`}>
      <div className="hidden md:flex">
        <AdBanner adKey="535ff1d1bbba323f23832ffee6164ca5" width={728} height={90} />
      </div>
      <div className="flex md:hidden">
        <AdBanner adKey="596f683fdd26dd89e90ed9e7ea86ed2c" width={320} height={50} />
      </div>
    </div>
  );
}

/**
 * Adsterra Native Banner (3305c8fd29d7736201962875fd385ef7).
 * Dynamically injects the async script alongside its target container div.
 */
export function NativeBanner({ className = "" }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || el.querySelector("script")) return;
    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = "https://brijmohan.org/21/3305c8fd29d7736201962875fd385ef7";
    el.appendChild(script);
  }, []);

  return (
    <div ref={wrapRef} className={`my-8 flex justify-center ${className}`} aria-label="Sponsored content">
      <div id="container-3305c8fd29d7736201962875fd385ef7" className="w-full" />
    </div>
  );
}
