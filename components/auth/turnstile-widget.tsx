"use client";

import { useEffect, useRef } from "react";

import { publicEnv } from "@/lib/public-env";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  onToken: (token: string) => void;
  onExpire?: () => void;
};

// Renders the Cloudflare Turnstile widget when NEXT_PUBLIC_TURNSTILE_SITE_KEY
// is set. When the key is empty (typical for local dev), renders nothing and
// the parent form proceeds without a token — the server skips verification too.
export function TurnstileWidget({ onToken, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return;
    }

    let cancelled = false;

    function ensureScript(): Promise<void> {
      if (document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`)) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = TURNSTILE_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("turnstile script failed to load"));
        document.head.appendChild(script);
      });
    }

    function render() {
      if (cancelled || !containerRef.current || !window.turnstile) {
        return;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        callback: (token) => onToken(token),
        "expired-callback": () => onExpire?.(),
        "error-callback": () => onExpire?.()
      });
    }

    ensureScript()
      .then(() => {
        // Turnstile populates window.turnstile asynchronously; poll briefly.
        const start = Date.now();
        const tick = () => {
          if (cancelled) return;
          if (window.turnstile) {
            render();
          } else if (Date.now() - start < 5_000) {
            setTimeout(tick, 100);
          }
        };
        tick();
      })
      .catch(() => {
        // Script failed to load — leave the widget empty; the server-side check
        // will reject the submission with a clear error.
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onToken, onExpire]);

  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} className="authStandaloneTurnstile" />;
}
