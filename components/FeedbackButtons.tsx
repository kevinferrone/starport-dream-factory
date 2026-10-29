"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Kind = "bug" | "feature";
const COPY: Record<Kind, { button: string; title: string; prompt: string; icon: string }> = {
  bug: {
    button: "Report a bug",
    title: "Report a bug",
    prompt: "Describe the bug in as much detail as possible: what you were doing, what you expected, and what happened instead.",
    icon: "🐞",
  },
  feature: {
    button: "Request a feature",
    title: "Request a feature",
    prompt: "Tell us what would make the Dream Factory better.",
    icon: "💡",
  },
};

/** Two small buttons in the corner that email a bug report or feature idea to Wider Path. */
export default function FeedbackButtons() {
  const path = usePathname();
  const [kind, setKind] = useState<Kind | null>(null);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (kind && !d.open) d.showModal();
    if (!kind && d.open) d.close();
  }, [kind]);

  const open = (k: Kind) => {
    setKind(k);
    setMessage("");
    setState("idle");
    setError(null);
  };
  const close = () => setKind(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kind) return;
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message, page: path }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Your message didn't send. Please try again.");
      setState("sent");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Your message didn't send. Please try again.");
    }
  };

  // Not on the sign-in page or inside the admin pages.
  if (path.startsWith("/login") || path.startsWith("/admin")) return null;
  const c = kind ? COPY[kind] : null;

  return (
    <>
      <div className="feedback-buttons no-print">
        {(Object.keys(COPY) as Kind[]).map((k) => (
          <button key={k} type="button" className="feedback-btn" onClick={() => open(k)} title={COPY[k].button}>
            <span aria-hidden>{COPY[k].icon}</span>
            <span className="text">{COPY[k].button}</span>
          </button>
        ))}
      </div>

      <dialog ref={dialog} className="feedback-dialog" onClose={close} onCancel={close}>
        {c && (
          <form onSubmit={send} className="form" method="dialog">
            <h2>
              <span aria-hidden>{c.icon}</span> {c.title}
            </h2>
            {state === "sent" ? (
              <>
                <p className="feedback-thanks">Thank you! We got your message and will read it soon.</p>
                <div className="actions" style={{ justifyContent: "flex-start" }}>
                  <button type="button" className="big-btn small" onClick={close}>Done</button>
                </div>
              </>
            ) : (
              <>
                <label htmlFor="feedback-message" className="hint">{c.prompt}</label>
                <textarea
                  id="feedback-message"
                  className="idea"
                  rows={6}
                  maxLength={4000}
                  required
                  autoFocus
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                {error && <p className="error" role="alert">{error}</p>}
                <div className="actions" style={{ justifyContent: "flex-start" }}>
                  <button type="submit" className="big-btn small" disabled={state === "sending" || message.trim().length < 3}>
                    {state === "sending" ? "Sending…" : "Send"}
                  </button>
                  <button type="button" className="big-btn small plain" onClick={close}>Cancel</button>
                </div>
              </>
            )}
          </form>
        )}
      </dialog>
    </>
  );
}
