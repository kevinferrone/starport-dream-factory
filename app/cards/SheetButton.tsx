"use client";

import { useState } from "react";
import type { SheetCard } from "@/lib/card-pdf";
import { speak } from "@/components/ReadAloud";
import { PHRASES } from "@/lib/voice-phrases";

/** Downloads a print sheet: 6 cards per page, 2 rows of 3. */
export default function SheetButton({ cards, name, label }: { cards: SheetCard[]; name: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const { downloadSheetPdf } = await import("@/lib/card-pdf");
      await downloadSheetPdf(cards, name);
    } catch {
      setError("Couldn't make the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        className="big-btn small plain"
        onClick={go}
        disabled={busy || !cards.length}
        onMouseEnter={() => speak(PHRASES.pdf)}
      >
        <span className="emoji" aria-hidden>🖨️</span>
        {busy ? `Making ${cards.length} cards…` : label}
      </button>
      {error && <p className="error">{error}</p>}
    </>
  );
}
