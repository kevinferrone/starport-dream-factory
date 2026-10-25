"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EmailLogin() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${site}/auth/callback` },
    });
    setBusy(false);
    if (error) setError(`We couldn't send the link: ${error.message}`);
    else setSent(true);
  };

  if (sent) {
    return (
      <div className="form">
        <h2>
          <span className="emoji" aria-hidden>📬</span> Check your email
        </h2>
        <p className="hint">
          We sent a sign-in link to <b>{email}</b>. Open it on this device to start building.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="form">
      <h2>
        <span className="emoji" aria-hidden>✉️</span> Grown-ups, sign in
      </h2>
      <p className="hint">Enter your email and we&apos;ll send you a magic link. No password needed.</p>
      {error && <p className="error">{error}</p>}
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        aria-label="Email address"
      />
      <button className="big-btn small" type="submit" disabled={busy}>
        <span className="emoji" aria-hidden>✨</span> {busy ? "Sending…" : "Send my magic link"}
      </button>
      <p className="hint">New here? The same link creates your account, with 10 free creations.</p>
    </form>
  );
}
