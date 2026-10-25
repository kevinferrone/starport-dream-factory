"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Lets a parent add a password so they can sign in without waiting for an email. */
export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setMsg({ ok: false, text: "Use at least 8 characters." });
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    setMsg(
      error
        ? { ok: false, text: `Couldn't save the password: ${error.message}` }
        : { ok: true, text: "Password saved. Next time, choose “I have a password” on the sign-in screen." }
    );
    if (!error) setPassword("");
  };

  return (
    <section className="panel" style={{ maxWidth: 560, margin: "0 auto 18px" }}>
      <form onSubmit={save} className="form">
        <h2>
          <span className="emoji" aria-hidden>🔐</span> Password
        </h2>
        <p className="hint">Optional. Add one so you can sign in on any device without a sign-in email.</p>
        {msg && (
          <p className="error" style={msg.ok ? { background: "#d9fbef", color: "#0d6b4e" } : undefined}>
            {msg.text}
          </p>
        )}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (8+ characters)"
          aria-label="New password"
          autoComplete="new-password"
        />
        <button className="big-btn small" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
    </section>
  );
}
