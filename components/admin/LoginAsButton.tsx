"use client";

import { useState } from "react";
import { loginAsUrl } from "@/app/admin/users/[id]/actions";

export default function LoginAsButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        className="big-btn small"
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await loginAsUrl(id);
          if (res.url) window.location.assign(res.url); // full page load so the new sign-in sticks
          else {
            setError(res.error ?? "Something went wrong.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Signing in…" : "Log in as this user"}
      </button>
      <p className="hint">Signs you out of your own account. Sign back in as yourself when you&apos;re done.</p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
