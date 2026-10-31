"use client";

import { useEffect, useRef, useState } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const UNAVAILABLE = "Не удалось пройти проверку. Попробуйте ещё раз.";

type Turnstile = {
  ready: (callback: () => void) => void;
  render: (element: HTMLElement, options: {
    sitekey: string;
    theme: "auto";
    size: "flexible";
    "response-field": false;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
    "timeout-callback": () => void;
  }) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

declare global {
  interface Window { turnstile?: Turnstile; }
}

let scriptLoading: Promise<Turnstile> | null = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(fail, 10_000);
    function fail() {
      clearTimeout(timeout);
      script.onload = script.onerror = null;
      script.remove();
      scriptLoading = null;
      reject(new Error(UNAVAILABLE));
    }
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      const sdk = window.turnstile;
      if (!sdk) return fail();
      sdk.ready(() => { clearTimeout(timeout); resolve(sdk); });
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return scriptLoading;
}

// One owner for the token, request in flight and SDK lifetime. Callers keep the
// keyed widget in both form steps and cross this interface with their request.
export function useTurnstile(siteKey: string) {
  const container = useRef<HTMLDivElement | null>(null);
  const instance = useRef<{ sdk: Turnstile; id: string; siteKey: string } | null>(null);
  const token = useRef<string | null>(null);
  const inFlight = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!siteKey || !container.current) return;
    let active = true;
    const element = container.current;
    let mounted: typeof instance.current = null;
    const clearToken = () => { token.current = null; setReady(false); };
    loadTurnstile().then((sdk) => {
      if (!active) return;
      clearToken();
      setError(null);
      const id = sdk.render(element, {
        sitekey: siteKey,
        theme: "auto",
        size: "flexible",
        "response-field": false,
        callback: (value) => {
          if (!active) return;
          token.current = value;
          setReady(true);
          setError(null);
        },
        "expired-callback": () => { if (active) clearToken(); },
        "error-callback": () => { if (active) { clearToken(); setError(UNAVAILABLE); } },
        "timeout-callback": () => { if (active) { clearToken(); setError(UNAVAILABLE); } }
      });
      mounted = { sdk, id, siteKey };
      instance.current = mounted;
    }).catch(() => { if (active) { clearToken(); setError(UNAVAILABLE); } });
    return () => {
      active = false;
      token.current = null;
      if (instance.current === mounted) instance.current = null;
      if (mounted) mounted.sdk.remove(mounted.id);
    };
  }, [siteKey, attempt]);

  function refresh() {
    if (inFlight.current) return;
    token.current = null;
    setReady(false);
    setError(null);
    const current = instance.current;
    if (!current) {
      setAttempt((value) => value + 1);
      return;
    }
    try { current.sdk.reset(current.id); } catch { setError(UNAVAILABLE); }
  }

  async function run<T>(request: (value: string | undefined) => Promise<T>): Promise<T> {
    if (inFlight.current) throw new Error("Дождитесь завершения отправки.");
    const current = instance.current;
    const value = token.current;
    if (siteKey && (!value || current?.siteKey !== siteKey)) {
      throw new Error("Подождите, идёт проверка…");
    }
    inFlight.current = true;
    setBusy(true);
    token.current = null;
    setReady(false);
    try {
      return await request(siteKey ? value! : undefined);
    } finally {
      inFlight.current = false;
      setBusy(false);
      // Reset only after the request: the server may still be validating its token.
      if (current && instance.current === current) refresh();
    }
  }

  const widget = siteKey ? (
    <div key="turnstile" className="authStandaloneTurnstile">
      <div ref={container} />
      {error && <>
        <p className="authStandaloneError" role="alert">{error}</p>
        <button type="button" className="authStandaloneFooterLink" onClick={refresh} disabled={busy}>Повторить проверку</button>
      </>}
    </div>
  ) : null;

  return { ready: !busy && (!siteKey || ready), widget, run };
}
