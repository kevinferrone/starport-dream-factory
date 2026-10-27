"use client";

import { useCallback, useState } from "react";
import GoogleButton from "./GoogleButton";
import { createClient } from "@/lib/supabase/client";

export default function EmailLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Always come back to the exact address the parent is on, so the sign-in can finish.
  const site = () => window.location.origin;

  const google = async () => {
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${site()}/auth/callback` },
    });
    if (error) setError(`Google sign-in didn't work: ${error.message}`);
  };

  const showError = useCallback((msg: string) => setError(msg), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (usePassword) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) setError("That email and password don't match. Try again, or use a sign-in link.");
      else window.location.href = "/";
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${site()}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      setError(
        /rate limit/i.test(error.message)
          ? "Too many sign-in emails were sent just now. Please wait a few minutes, or sign in with Google."
          : `We couldn't send the link: ${error.message}`
      );
    } else setSent(true);
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
    <div className="form">
      <h2>
        <span className="emoji" aria-hidden>🔑</span> Grown-ups, sign in
      </h2>
      {error && <p className="error">{error}</p>}

      <GoogleButton
        onError={showError}
        fallback={
        <button type="button" className="google-btn" onClick={google}>
          <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.2-.1-2.3-.4-3.5z"/>
          </svg>
          Continue with Google
        </button>
        }
      />

      <div className="or"><span>or use your email</span></div>

      <form onSubmit={submit} className="form">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          autoComplete="email"
        />
        {usePassword && (
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            autoComplete="current-password"
          />
        )}
        <button className="big-btn small" type="submit" disabled={busy}>
          <span className="emoji" aria-hidden>{usePassword ? "🔓" : "✨"}</span>
          {busy ? "One moment…" : usePassword ? "Sign in" : "Email me a sign-in link"}
        </button>
        <button type="button" className="text-btn" onClick={() => setUsePassword((v) => !v)}>
          {usePassword ? "Use a sign-in link instead" : "I have a password"}
        </button>
      </form>
      <p className="hint">
        New here? Google or the sign-in link creates your account, with 3 free creations. You can add a
        password later on the Grown-ups page.
      </p>
      <p className="hint">
        By signing in you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy policy</a>.
      </p>
    </div>
  );
}
