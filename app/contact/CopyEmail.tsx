"use client";

import { useState } from "react";

export default function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="big-btn small plain"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(email);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          window.prompt("Copy this email address:", email);
        }
      }}
    >
      <span className="emoji" aria-hidden>{copied ? "✅" : "📋"}</span>
      {copied ? "Copied!" : "Copy the email address"}
    </button>
  );
}
