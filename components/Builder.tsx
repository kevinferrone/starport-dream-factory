"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GROUPS,
  KINDS,
  DIFFICULTY_MIN,
  DIFFICULTY_MAX,
  difficultyFace,
  type Kind,
  type Option,
  type OptionGroup,
  allOptions,
} from "@/lib/options";
import { speak, useSpeakOnHover, warmVoices } from "@/components/ReadAloud";
import { PHRASES, difficultyPhrase } from "@/lib/voice-phrases";

type Props = {
  kind: Kind;
  remaining: number;
  initial?: {
    choices: Record<string, string[]>;
    difficulty?: number;
    text?: string;
    drawingPath?: string;
    drawingUrl?: string;
  };
};

/** Shrinks a photo of a drawing to a small JPEG (fast to upload, plenty for the illustrator). */
async function shrinkPhoto(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const max = 1024;
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * s);
  canvas.height = Math.round(bmp.height * s);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white page behind them
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

const MACHINE_ICONS: Record<Kind, string[]> = {
  creature: ["🦖", "🐙", "🦄", "👾"],
  equipment: ["🪄", "👑", "🧪", "🥾"],
  pet: ["🐱", "🐸", "🦉", "🐰"],
};

export default function Builder({ kind, remaining, initial }: Props) {
  const router = useRouter();
  const groups = GROUPS[kind];
  const k = KINDS[kind];

  const [choices, setChoices] = useState<Record<string, string[]>>(initial?.choices ?? {});
  const [difficulty, setDifficulty] = useState<number>(initial?.difficulty ?? 10);
  const [text, setText] = useState(initial?.text ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A new drawing (data URL), or one carried over from an earlier card.
  const [drawing, setDrawing] = useState<string | null>(null);
  const [keptDrawing, setKeptDrawing] = useState<{ path: string; url: string } | null>(
    initial?.drawingPath && initial.drawingUrl ? { path: initial.drawingPath, url: initial.drawingUrl } : null
  );
  const say = useSpeakOnHover();
  const preview = drawing ?? keptDrawing?.url ?? null;

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setDrawing(await shrinkPhoto(file));
      setKeptDrawing(null);
    } catch {
      setError("That picture didn't work. Try a different photo.");
    }
  };
  const removeDrawing = () => {
    speak(PHRASES.removeDrawing);
    setDrawing(null);
    setKeptDrawing(null);
  };

  // Record this builder's words ahead of time so hovering speaks right away.
  useEffect(() => {
    warmVoices([
      k.button,
      PHRASES.addDrawing,
      PHRASES.removeDrawing,
      ...groups.flatMap((g) => allOptions(g).map((o) => o.label)),
    ]);
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (g: OptionGroup, opt: Option) => {
    setChoices((prev) => {
      const cur = prev[g.id] ?? [];
      if (cur.includes(opt.id)) return { ...prev, [g.id]: cur.filter((x) => x !== opt.id) };
      if (g.max === 1) return { ...prev, [g.id]: [opt.id] }; // single choice: swap
      if (cur.length >= g.max) return prev;
      return { ...prev, [g.id]: [...cur, opt.id] };
    });
  };

  const outOfBuilds = remaining <= 0;
  const nothingPicked = !preview && !text.trim() && groups.every((g) => !(choices[g.id]?.length));

  const build = async () => {
    setError(null);
    setBusy(true);
    speak(PHRASES.building);
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          choices,
          difficulty: kind === "creature" ? difficulty : undefined,
          text,
          drawing: drawing ?? undefined,
          drawingPath: !drawing && keptDrawing ? keptDrawing.path : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "limit") router.push("/plans?limit=1");
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      router.push(`/cards/${data.id}`);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  };

  const face = difficultyFace(difficulty);

  return (
    <div className={`kind-${kind}`}>
      <div className="hero" style={{ paddingTop: 6 }}>
        <h1 className="build-title">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/tiles/${kind}.webp`} alt="" aria-hidden />
          {k.title}
        </h1>
      </div>

      <section className="panel drawing-panel">
        <h2>
          <span className="emoji" aria-hidden>🖍️</span>
          Did you draw it? (optional)
        </h2>
        <p className="hint">Take a photo of your drawing and the factory will bring it to life!</p>
        {preview ? (
          <div className="drawing-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Your drawing" />
            <div className="drawing-actions">
              <label className="big-btn small plain" onMouseEnter={() => speak(PHRASES.addDrawing)}>
                <span className="emoji" aria-hidden>🔄</span> Use a different drawing
                <input type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
              </label>
              <button
                type="button"
                className="big-btn small plain"
                onClick={removeDrawing}
                onMouseEnter={() => speak(PHRASES.removeDrawing)}
              >
                <span className="emoji" aria-hidden>✖️</span> Remove drawing
              </button>
            </div>
          </div>
        ) : (
          <label className="pick drawing-pick" onMouseEnter={() => speak(PHRASES.addDrawing)}>
            <span className="emoji" aria-hidden>📷</span>
            Add my drawing
            <input type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </label>
        )}
      </section>

      {groups.map((g) => {
        const picked = choices[g.id] ?? [];
        const full = g.max > 1 && picked.length >= g.max;
        const renderOpt = (opt: Option) => {
          const on = picked.includes(opt.id);
          const { spokeOnClick, ...hover } = say(opt.label);
          return (
            <button
              {...hover}
              key={opt.id}
              type="button"
              className={`pick${g.id === "size" ? " wide" : ""}`}
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => {
                spokeOnClick();
                toggle(g, opt);
              }}
            >
              <span className="emoji" aria-hidden>{opt.icon}</span>
              {opt.label}
            </button>
          );
        };
        return (
          <section className="panel" key={g.id}>
            <h2>
              <span className="emoji" aria-hidden>{g.icon}</span>
              {g.title}
            </h2>
            <p className="hint">
              {g.max === 1 ? "Pick 1" : `Pick up to ${g.max} (${picked.length} picked)`}, or skip it for a surprise
            </p>
            {g.sections ? (
              g.sections.map((s) => (
                <div key={s.title}>
                  <div className="section-title">{s.title}</div>
                  <div className="grid">{s.options.map(renderOpt)}</div>
                </div>
              ))
            ) : (
              <div className="grid">{g.options!.map(renderOpt)}</div>
            )}
          </section>
        );
      })}

      {kind === "creature" && (
        <section className="panel">
          <h2>
            <span className="emoji" aria-hidden>🎯</span>
            How hard to beat?
          </h2>
          <div className="dial">
            <span className="face" aria-hidden>{face.icon}</span>
            <span className="num">{difficulty}</span>
            <input
              type="range"
              min={DIFFICULTY_MIN}
              max={DIFFICULTY_MAX}
              value={difficulty}
              aria-label="Difficulty"
              onChange={(e) => setDifficulty(Number(e.target.value))}
              onPointerUp={(e) => speak(difficultyPhrase(Number(e.currentTarget.value)))}
              onKeyUp={(e) => speak(difficultyPhrase(Number(e.currentTarget.value)))}
            />
          </div>
        </section>
      )}

      <section className="panel">
        <h2>
          <span className="emoji" aria-hidden>💭</span>
          Your idea (optional)
        </h2>
        <p className="hint">Tell the factory anything else. A grown-up can help you type.</p>
        <textarea
          className="idea"
          maxLength={300}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="It loves pancakes and is scared of puddles…"
        />
      </section>

      <div className="build-bar">
        <div style={{ textAlign: "center" }}>
          {error && <p className="error" role="alert">{error}</p>}
          {nothingPicked && !outOfBuilds && (
            <p className="surprise-note">
              <span aria-hidden>🎲</span> Nothing picked? The factory will surprise you!
            </p>
          )}
          {outOfBuilds ? (
            <Link className="big-btn gum" href="/plans">
              <span className="emoji" aria-hidden>⭐</span> Get more creations
            </Link>
          ) : (
            <button
              className="big-btn"
              onClick={build}
              disabled={busy}
              onMouseEnter={() => speak(k.button)}
            >
              <span className="emoji" aria-hidden>🏭</span>
              {k.button}
            </button>
          )}
        </div>
      </div>

      {busy && (
        <div className="machine" role="status" aria-live="polite">
          <div>
            <div className="orbit">
              <div className="ring" aria-hidden>
                {MACHINE_ICONS[kind].map((i) => (
                  <span key={i}>{i}</span>
                ))}
              </div>
              <div className="core" aria-hidden>✨</div>
            </div>
            <p>{preview ? "Bringing your drawing to life…" : "The Dream Factory is building…"}</p>
            <small>Drawing the picture takes about a minute</small>
          </div>
        </div>
      )}
    </div>
  );
}
