"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RESTING_MESSAGE } from "@/lib/messages";
import {
  GROUPS,
  KINDS,
  DIFFICULTY_MIN,
  COINS_MIN,
  COINS_MAX,
  coinFace,
  DIFFICULTY_MAX,
  difficultyFace,
  type Kind,
  type Option,
  type OptionGroup,
  allOptions,
  MAX_BRING,
} from "@/lib/options";
import { iconUrl, tileSrc } from "@/lib/hero-icons";
import { speak, useSpeakOnHover, warmVoices } from "@/components/ReadAloud";
import { PHRASES, difficultyPhrase, coinPhrase } from "@/lib/voice-phrases";
import FactoryScene from "@/components/FactoryScene";

/** A saved pet or equipment card a kid can bring into a character picture. */
export type BringCard = { id: string; kind: "pet" | "equipment"; name: string; imageUrl: string | null };

type Props = {
  kind: Kind;
  remaining: number;
  resting?: boolean;
  /** Characters: the kid's saved pets and equipment. */
  bringable?: BringCard[];
  initial?: {
    choices: Record<string, string[]>;
    difficulty?: number;
    text?: string;
    drawingPath?: string;
    drawingUrl?: string;
    bring?: string[];
    heroName?: string;
  };
};

/** A button's picture: a color circle, a painted icon (emoji until it's made), or an emoji. */
function OptIcon({ opt }: { opt: Option }) {
  // Painted icons load in the browser only, so a missing one never shows as a broken picture.
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    if (!opt.pic) return;
    const img = new Image();
    img.onload = () => setPainted(true);
    img.src = iconUrl(opt.id);
  }, [opt.pic, opt.id]);
  if (opt.swatch) return <span className="swatch" style={{ background: opt.swatch }} aria-hidden />;
  if (opt.pic)
    return (
      <span className="pic-icon" aria-hidden>
        {painted ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl(opt.id)} alt="" />
        ) : (
          <span className="emoji">{opt.icon}</span>
        )}
      </span>
    );
  return <span className="emoji" aria-hidden>{opt.icon}</span>;
}

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

export default function Builder({ kind, remaining, resting = false, initial, bringable = [] }: Props) {
  const router = useRouter();
  const groups = GROUPS[kind];
  const k = KINDS[kind];

  const [choices, setChoices] = useState<Record<string, string[]>>(initial?.choices ?? {});
  const [difficulty, setDifficulty] = useState<number>(initial?.difficulty ?? 10);
  // null = the factory picks the Coin value.
  const [coins, setCoins] = useState<number | null>(null);
  const [text, setText] = useState(initial?.text ?? "");
  // Characters: saved cards to bring along (in the order picked) and an optional name.
  const [bring, setBring] = useState<string[]>((initial?.bring ?? []).filter((id) => bringable.some((b) => b.id === id)));
  const [heroName, setHeroName] = useState(initial?.heroName ?? "");
  const isHero = kind === "character";
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
      if (g.onePerSection && g.sections) {
        // One per section: a new style replaces the old style, a new color the old color.
        const sec = g.sections.find((x) => x.options.some((y) => y.id === opt.id));
        const others = cur.filter((id) => !sec?.options.some((y) => y.id === id));
        return { ...prev, [g.id]: [...others, opt.id] };
      }
      if (cur.length >= g.max) return prev;
      return { ...prev, [g.id]: [...cur, opt.id] };
    });
  };

  const outOfBuilds = remaining <= 0;
  const nothingPicked =
    !preview && !text.trim() && !bring.length && !heroName.trim() && groups.every((g) => !(choices[g.id]?.length));
  const toggleBring = (id: string) =>
    setBring((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_BRING ? cur : [...cur, id]));

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
          coins: (kind === "equipment" || kind === "pet") && coins ? coins : undefined,
          bring: isHero && bring.length ? bring : undefined,
          heroName: isHero && heroName.trim() ? heroName.trim() : undefined,
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
      router.push(`/cards/${data.id}?new=1`);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  };

  const face = difficultyFace(difficulty);
  // The kid's picks, by name, for the factory scene.
  const pickLabels = [
    ...bring.map((id) => bringable.find((b) => b.id === id)?.name).filter((l): l is string => !!l),
    ...groups.flatMap((g) =>
      (choices[g.id] ?? []).map((id) => allOptions(g).find((o) => o.id === id)?.label).filter((l): l is string => !!l)
    ),
  ];

  return (
    <div className={`kind-${kind}`}>
      <div className="hero" style={{ paddingTop: 6 }}>
        <h1 className="build-title">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tileSrc(kind)} alt="" aria-hidden />
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
        const full = g.max > 1 && !g.onePerSection && picked.length >= g.max;
        const renderOpt = (opt: Option) => {
          const on = picked.includes(opt.id);
          const { spokeOnClick, ...hover } = say(opt.label);
          return (
            <button
              {...hover}
              key={opt.id}
              type="button"
              className={`pick${g.id === "size" ? " wide" : ""}${opt.pic ? " has-pic" : ""}`}
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => {
                spokeOnClick();
                toggle(g, opt);
              }}
            >
              <OptIcon opt={opt} />
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
              {g.hint ?? `${g.max === 1 ? "Pick 1" : `Pick up to ${g.max} (${picked.length} picked)`}, or skip it for a surprise`}
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
            Creature difficulty
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

      {isHero && (
        <section className="panel">
          <h2>
            <span className="emoji" aria-hidden>🎒</span>
            Bring your cards (optional)
          </h2>
          <p className="hint">
            Pick up to {MAX_BRING} of your saved pets and equipment to be in the picture with your hero ({bring.length} picked).
            Your cards come first: if two things go in the same spot, the first one is worn and the rest go in a bag.
          </p>
          {!bringable.length ? (
            <p className="hint">
              You don&apos;t have any saved pets or equipment yet. Make one with the <Link href="/build/pet">Pets</Link> or{" "}
              <Link href="/build/equipment">Equipment</Link> builder and save it.
            </p>
          ) : (
            (["pet", "equipment"] as const).map((k) => {
              const list = bringable.filter((b) => b.kind === k);
              if (!list.length) return null;
              return (
                <div key={k}>
                  <div className="section-title">{k === "pet" ? "Pets" : "Equipment"}</div>
                  <div className="bring-grid">
                    {list.map((b) => {
                      const n = bring.indexOf(b.id);
                      const on = n >= 0;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          className={`bring-card ${b.kind}`}
                          aria-pressed={on}
                          disabled={!on && bring.length >= MAX_BRING}
                          onClick={() => toggleBring(b.id)}
                        >
                          {on && <span className="bring-num" aria-label={`Pick ${n + 1}`}>{n + 1}</span>}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {b.imageUrl ? <img src={b.imageUrl} alt="" /> : <span className="bring-blank" />}
                          <span className="bring-name">{b.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </section>
      )}

      {isHero && (
        <section className="panel">
          <h2>
            <span className="emoji" aria-hidden>🏷️</span>
            Your hero&apos;s name (optional)
          </h2>
          <p className="hint">Skip it and the factory will think of a name.</p>
          <input
            className="idea hero-name"
            type="text"
            maxLength={40}
            value={heroName}
            onChange={(e) => setHeroName(e.target.value)}
            onFocus={() => speak(PHRASES.heroName)}
            placeholder="Captain Pockets"
          />
        </section>
      )}

      {(kind === "equipment" || kind === "pet") && (
        <section className="panel">
          <h2>
            <span className="emoji" aria-hidden>🪙</span>
            How many Coins is it worth?
          </h2>
          <p className="hint">More Coins make it more powerful.</p>
          <div className="dial">
            <span className="face" aria-hidden>{coins ? coinFace(coins).icon : "🎲"}</span>
            <span className="num">{coins ?? "?"}</span>
            <input
              type="range"
              min={COINS_MIN}
              max={COINS_MAX}
              value={coins ?? 10}
              aria-label="Coin value"
              onChange={(e) => setCoins(Number(e.target.value))}
              onPointerUp={(e) => speak(coinPhrase(Number(e.currentTarget.value)))}
              onKeyUp={(e) => speak(coinPhrase(Number(e.currentTarget.value)))}
            />
          </div>
          <button
            type="button"
            className={`chip-toggle${coins === null ? " on" : ""}`}
            onClick={() => {
              setCoins(null);
              speak(PHRASES.factoryPicks);
            }}
            aria-pressed={coins === null}
          >
            🎲 The factory picks
          </button>
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
          placeholder={isHero ? "My hero hums all the time and loves jumping in puddles…" : "It loves pancakes and is scared of puddles…"}
        />
      </section>

      <div className="build-bar">
        <div style={{ textAlign: "center" }}>
          {error && <p className="error" role="alert">{error}</p>}
          {nothingPicked && !outOfBuilds && !resting && (
            <p className="surprise-note">
              <span aria-hidden>🎲</span> Nothing picked? The factory will surprise you!
            </p>
          )}
          {resting ? (
            <p className="resting-note" role="status">
              <span aria-hidden>😴</span> {RESTING_MESSAGE}
            </p>
          ) : outOfBuilds ? (
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
              {k.button}
            </button>
          )}
        </div>
      </div>

      {busy && <FactoryScene kind={kind} picks={pickLabels} drawing={!!preview} />}
    </div>
  );
}
