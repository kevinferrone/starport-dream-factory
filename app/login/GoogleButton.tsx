"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Google's own sign-in button. It runs on our domain, so Google's screen says
// "Sign in to starportdreamfactory.com" (or our app name once Google verifies the branding),
// not the Supabase address. Supabase then checks Google's answer and signs the grown-up in.

type GoogleId = {
  accounts: {
    id: {
      initialize: (o: Record<string, unknown>) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
};
declare global {
  interface Window {
    google?: GoogleId;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById("gsi-script") as HTMLScriptElement | null;
    const s = existing ?? document.createElement("script");
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("Couldn't load Google sign-in.")));
    if (!existing) {
      s.id = "gsi-script";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

export default function GoogleButton({ fallback, onError }: { fallback: React.ReactNode; onError: (msg: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!CLIENT_ID);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    (async () => {
      try {
        await loadScript();
        if (cancelled || !box.current || !window.google) return;
        const nonce = crypto.randomUUID();
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          nonce: await sha256Hex(nonce),
          ux_mode: "popup",
          use_fedcm_for_button: true,
          callback: async (res: { credential?: string }) => {
            if (!res.credential) return onError("Google sign-in didn't finish. Please try again.");
            const { error } = await createClient().auth.signInWithIdToken({
              provider: "google",
              token: res.credential,
              nonce,
            });
            if (error) onError(`Google sign-in didn't work: ${error.message}`);
            else window.location.href = "/";
          },
        });
        window.google.accounts.id.renderButton(box.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "center",
          width: Math.min(400, box.current.offsetWidth || 320),
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  if (failed) return <>{fallback}</>;
  return <div ref={box} className="gsi-box" />;
}
