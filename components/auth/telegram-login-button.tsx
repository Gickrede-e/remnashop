"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { sanitizeNextPath } from "@/lib/auth/navigation";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, string>) => void;
  }
}

export function TelegramLoginButton({
  botUsername,
  nextPath,
  className
}: {
  botUsername?: string;
  nextPath?: string;
  className?: string;
}) {
  const router = useRouter();
  const safeNextPath = sanitizeNextPath(nextPath);

  useEffect(() => {
    if (!botUsername) return;

    window.onTelegramAuth = async (user) => {
      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(user)
      });

      if (response.ok) {
        router.push(safeNextPath ?? "/dashboard");
        router.refresh();
      }
    };

    const container = document.getElementById("telegram-login-container");
    if (!container || container.childElementCount > 0) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
      delete window.onTelegramAuth;
    };
  }, [botUsername, router, safeNextPath]);

  if (!botUsername) {
    return null;
  }

  return <div id="telegram-login-container" className={cn("authTelegramWidget", className)} />;
}
