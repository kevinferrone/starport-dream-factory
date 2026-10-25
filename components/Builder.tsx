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
import { PHRASES, pickFirst, difficultyPhrase } from "@/lib/voice-phrases";

type Props = {
  kind: Kind;
  remaining: number;
  initial?: { choices: Record<string, string[]>; difficulty?: number; text?: string };
};

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
  const say = useSpeakOnHover();

  // Record this builder's words ahead of time so hovering speaks right away.
  useEffect(() => {
    warmVoices([k.button, ...groups.flatMap((g) => allOptions(g).map((o) => o.label))]);
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

  const missing = groups.find((g) => (choices[g.id]?.length ?? 0) < g.min);
  const outOfBuilds = remaining <= 0;

  const build = async () => {
    if (missing) {
      speak(pickFirst(missing.title));
      setError(`Pick ${missing.title.toLowerCase()} first!`);
      return;
    }
    setError(null);
    setBusy(true);
    speak(PHRASES.building);
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, choices, difficulty: kind === "creature" ? difficulty : undefined, text }),
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
              {g.max === 1 ? "Pick 1" : `Pick up to ${g.max} (${picked.length} picked)`}
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
            <p>The Dream Factory is building…</p>
            <small>Drawing the picture takes about a minute</small>
          </div>
        </div>
      )}
    </div>
  );
}
