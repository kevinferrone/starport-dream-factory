"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Kind } from "@/lib/options";
import type { AnyCard } from "@/lib/generate";
import Card from "@/components/Card";
import Link from "next/link";
import { speak } from "@/components/ReadAloud";
import { PHRASES } from "@/lib/voice-phrases";

type Props = {
  id: string;
  kind: Kind;
  card: AnyCard;
  imageUrl: string | null;
  saved: boolean;
  rerollsLeft: number;
};

export default function CardActions(props: Props) {
  const router = useRouter();
  const [card, setCard] = useState(props.card);
  const [saved, setSaved] = useState(props.saved);
  const [rerollsLeft, setRerollsLeft] = useState(props.rerollsLeft);
  const [busy, setBusy] = useState<null | "shake" | "save" | "pdf">(null);
  const [error, setError] = useState<string | null>(null);

  const post = async (url: string) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: props.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  };

  const shake = async () => {
    speak(PHRASES.shaking);
    setBusy("shake");
    setError(null);
    try {
      const data = await post("/api/reroll");
      setCard(data.card);
      setRerollsLeft((n) => n - 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    speak(PHRASES.saved);
    setBusy("save");
    try {
      await post("/api/save");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(null);
    }
  };

  const pdf = async () => {
    setBusy("pdf");
    try {
      const node = document.getElementById("the-card");
      if (!node) return;
      const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const dataUrl = await toPng(node, { pixelRatio: 2.5, backgroundColor: "#ffffff" });
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      // A letter-size page with the card centered, 4.5 inches wide.
      const doc = new jsPDF({ unit: "in", format: "letter" });
      const w = 4.5;
      const h = (img.height / img.width) * w;
      doc.addImage(dataUrl, "PNG", (8.5 - w) / 2, 0.75, w, h);
      doc.save(`${card.name.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
    } catch {
      setError("Couldn't make the PDF. Try Print and choose Save as PDF.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!confirm("Throw this card away?")) return;
    await post("/api/delete");
    router.push("/cards");
  };

  return (
    <div className="card-stage">
      <Card kind={props.kind} card={card} imageUrl={props.imageUrl} />

      {error && <p className="error no-print" role="alert">{error}</p>}

      <div className="actions">
        <button
          className="big-btn small"
          onClick={shake}
          disabled={!!busy || rerollsLeft <= 0}
          onMouseEnter={() => speak(PHRASES.shaking)}
        >
          <span className="emoji" aria-hidden>🎲</span>
          {busy === "shake" ? "Shaking…" : "Shake up the stats"}
        </button>
        <Link
          className="big-btn small plain"
          href={`/build/${props.kind}?from=${props.id}`}
          onMouseEnter={() => speak(PHRASES.changeButtons)}
        >
          <span className="emoji" aria-hidden>🔁</span>
          Change my buttons
        </Link>
        {!saved ? (
          <button
            className="big-btn small mint"
            onClick={save}
            disabled={!!busy}
            onMouseEnter={() => speak(PHRASES.saveCard)}
          >
            <span className="emoji" aria-hidden>💾</span>
            Save my card
          </button>
        ) : (
          <span className="big-btn small mint" aria-live="polite">
            <span className="emoji" aria-hidden>✅</span>
            Saved
          </span>
        )}
        <button
          className="big-btn small gum"
          onClick={() => window.print()}
          disabled={!!busy}
          onMouseEnter={() => speak(PHRASES.print)}
        >
          <span className="emoji" aria-hidden>🖨️</span>
          Print
        </button>
        <button
          className="big-btn small plain"
          onClick={pdf}
          disabled={!!busy}
          onMouseEnter={() => speak(PHRASES.pdf)}
        >
          <span className="emoji" aria-hidden>📄</span>
          {busy === "pdf" ? "Making PDF…" : "Download PDF"}
        </button>
      </div>

      <p className="note">
        Shaking up the stats keeps your picture and is free ({rerollsLeft} shakes left).
        Changing your buttons makes a brand-new picture and uses 1 creation.
      </p>
      {saved && (
        <button className="icon-link no-print" onClick={remove}>
          <span className="emoji" aria-hidden>🗑️</span>
          <span>Throw away</span>
        </button>
      )}
    </div>
  );
}
