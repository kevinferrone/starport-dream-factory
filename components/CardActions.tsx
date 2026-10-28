"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Kind } from "@/lib/options";
import type { AnyCard } from "@/lib/generate";
import Card from "@/components/Card";
import CardEditor from "@/components/CardEditor";
import { speak } from "@/components/ReadAloud";
import { PHRASES } from "@/lib/voice-phrases";
import { readingRate } from "@/lib/reading-level";

/** "Change the stats" is built and working but hidden for now (MVP). Set to true to bring it back. */
const SHOW_CHANGE_STATS = false;

type Props = {
  id: string;
  kind: Kind;
  card: AnyCard;
  imageUrl: string | null;
  saved: boolean;
  rerollsLeft: number;
  readingLevel: number | null;
};

export default function CardActions(props: Props) {
  const router = useRouter();
  const [card, setCard] = useState(props.card);
  const [saved, setSaved] = useState(props.saved);
  const [rerollsLeft, setRerollsLeft] = useState(props.rerollsLeft);
  const [busy, setBusy] = useState<null | "shake" | "save" | "pdf" | "read" | "print" | "edit">(null);
  const [editing, setEditing] = useState<AnyCard | null>(null); // the card as it was before editing
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frame = useRef<number>(0);

  const stopReading = () => {
    audioRef.current?.pause();
    cancelAnimationFrame(frame.current);
    setReading(false);
    setHighlight(null);
  };
  useEffect(() => stopReading, []);

  // Reads the whole card aloud, lighting up each word as it's spoken.
  const readCard = async () => {
    if (reading) return stopReading();
    setBusy("read");
    setError(null);
    try {
      const data = (await post("/api/card-voice")) as { audio: string; times: { s: number; e: number }[] };
      const audio = new Audio(data.audio);
      audioRef.current = audio;
      // Slower for younger readers. Pitch stays natural; highlights follow the audio's own clock.
      audio.preservesPitch = true;
      audio.defaultPlaybackRate = readingRate(props.readingLevel);
      audio.playbackRate = readingRate(props.readingLevel);
      const tick = () => {
        const t = audio.currentTime;
        let idx = -1;
        for (let i = 0; i < data.times.length; i++) {
          if (data.times[i].s <= t + 0.04) idx = i;
          else break;
        }
        setHighlight(idx >= 0 ? idx : null);
        frame.current = requestAnimationFrame(tick);
      };
      audio.onended = stopReading;
      await audio.play();
      setReading(true);
      frame.current = requestAnimationFrame(tick);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read this card right now.");
    } finally {
      setBusy(null);
    }
  };

  const startEdit = () => {
    stopReading();
    setError(null);
    setEditing(card);
  };
  const cancelEdit = () => {
    if (editing) setCard(editing);
    setEditing(null);
    setError(null);
  };
  const saveEdit = async () => {
    setBusy("edit");
    setError(null);
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: props.id, card }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save your changes.");
      setCard(data.card);
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your changes.");
    } finally {
      setBusy(null);
    }
  };

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
    stopReading();
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
      const { downloadCardPdf } = await import("@/lib/card-pdf");
      await downloadCardPdf(props.kind, card, props.imageUrl);
    } catch {
      setError("Couldn't make the PDF. Try Print and choose Save as PDF.");
    } finally {
      setBusy(null);
    }
  };

  // Print the exact tarot-size card. The tab opens during the click so it isn't blocked.
  const print = async () => {
    const win = window.open("", "_blank");
    setBusy("print");
    try {
      const { printCard } = await import("@/lib/card-pdf");
      await printCard(win, props.kind, card, props.imageUrl);
    } catch {
      win?.close();
      setError("Couldn't get the card ready to print. Try Download PDF.");
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
      <Card kind={props.kind} card={card} imageUrl={props.imageUrl} highlight={highlight} />

      {editing ? (
        <>
          {error && <p className="error no-print" role="alert">{error}</p>}
          <CardEditor
            kind={props.kind}
            card={card}
            onChange={setCard}
            onSave={saveEdit}
            onCancel={cancelEdit}
            busy={busy === "edit"}
          />
        </>
      ) : (
      <>
      <button
        className={`big-btn read-btn${reading ? " gum" : ""}`}
        onClick={readCard}
        disabled={busy === "read" || busy === "shake"}
        onMouseEnter={() => !reading && speak(PHRASES.readCard)}
      >
        <span className="emoji" aria-hidden>{reading ? "⏹️" : "🔊"}</span>
        {busy === "read" ? "Getting ready…" : reading ? "Stop reading" : "Read my card"}
      </button>

      {error && <p className="error no-print" role="alert">{error}</p>}

      <div className="actions">
        {SHOW_CHANGE_STATS && (
        <button
          className="big-btn small"
          onClick={shake}
          disabled={!!busy || rerollsLeft <= 0}
          onMouseEnter={() => speak(PHRASES.shaking)}
        >
          <span className="emoji" aria-hidden>🎲</span>
          {busy === "shake" ? "Changing…" : "Change the stats"}
        </button>
        )}
        <button
          className="big-btn small plain"
          onClick={startEdit}
          disabled={!!busy}
          onMouseEnter={() => speak(PHRASES.editCard)}
        >
          <span className="emoji" aria-hidden>✏️</span>
          Edit my card
        </button>
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
          onClick={print}
          disabled={!!busy}
          onMouseEnter={() => speak(PHRASES.print)}
        >
          <span className="emoji" aria-hidden>🖨️</span>
          {busy === "print" ? "Getting ready…" : "Print"}
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

      {SHOW_CHANGE_STATS && (
        <p className="note">
          Changing the stats keeps your picture and is free ({rerollsLeft} changes left).
        </p>
      )}
      {saved && (
        <button className="icon-link no-print" onClick={remove}>
          <span className="emoji" aria-hidden>🗑️</span>
          <span>Throw away</span>
        </button>
      )}
      </>
      )}
    </div>
  );
}
