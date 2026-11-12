"use client";

import { useState } from "react";
import { iconUrl } from "@/lib/hero-icons";

type Icon = { id: string; label: string; emoji: string; made: boolean };

/** Admin: paints the "Who are you?" button icons (kid versions), a few at a time. */
export default function HeroIcons({ icons }: { icons: Icon[] }) {
  const [made, setMade] = useState(() => new Set(icons.filter((i) => i.made).map((i) => i.id)));
  const [working, setWorking] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [bust, setBust] = useState(0); // reloads pictures after a redo

  const run = async (ids: string[]) => {
    for (let i = 0; i < ids.length; i += 6) {
      const batch = ids.slice(i, i + 6);
      setWorking((w) => new Set([...w, ...batch]));
      try {
        const res = await fetch("/api/admin/hero-icons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: batch }),
        });
        const data = (await res.json()) as { results?: { id: string; ok: boolean }[] };
        for (const r of data.results ?? []) {
          if (r.ok) setMade((m) => new Set([...m, r.id]));
          setFailed((f) => {
            const n = new Set(f);
            if (r.ok) n.delete(r.id);
            else n.add(r.id);
            return n;
          });
        }
      } finally {
        setWorking((w) => new Set([...w].filter((x) => !batch.includes(x))));
        setBust(Date.now());
      }
    }
  };

  const [tile, setTile] = useState<"idle" | "painting" | "failed">("idle");
  const [tileV, setTileV] = useState(0);
  const paintTile = async () => {
    setTile("painting");
    const res = await fetch("/api/admin/hero-tile", { method: "POST" });
    setTile(res.ok ? "idle" : "failed");
    if (res.ok) setTileV(Date.now());
  };

  const missing = icons.filter((i) => !made.has(i.id)).map((i) => i.id);
  const busy = working.size > 0;

  return (
    <section className="panel">
      <h2>Characters tile</h2>
      <p className="hint">
        The full-body Pockets on the Characters tile, card badge and menu, painted from her portrait. Until it&apos;s made,
        the round portrait shows. About 25 cents, takes about a minute.
      </p>
      <div className="hero-tile-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/hero-tile.webp${tileV ? `?v=${tileV}` : ""}`} alt="Characters tile" />
        <button className="big-btn small" disabled={tile === "painting"} onClick={paintTile}>
          {tile === "painting" ? "Painting…" : tile === "failed" ? "Failed, try again" : "Paint full-body Pockets"}
        </button>
      </div>

      <h2 style={{ marginTop: 24 }}>Character icons</h2>
      <p className="hint">
        Painted &quot;Who are you?&quot; buttons for the Characters builder, each a kid version. Kids see the emoji until
        an icon is made. About 4 cents each.
      </p>
      <p>
        <button className="big-btn small" disabled={busy || !missing.length} onClick={() => run(missing)}>
          {busy ? `Painting… (${working.size} in progress)` : missing.length ? `Make ${missing.length} missing icons` : "All icons made"}
        </button>
      </p>
      <div className="hero-icon-grid">
        {icons.map((i) => (
          <div key={i.id} className="hero-icon-cell">
            {made.has(i.id) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${iconUrl(i.id)}${bust ? `?v=${bust}` : ""}`} alt="" />
            ) : (
              <span className="emoji">{i.emoji}</span>
            )}
            <span>{i.label}</span>
            <button className="icon-link" disabled={working.has(i.id)} onClick={() => run([i.id])}>
              {working.has(i.id) ? "Painting…" : failed.has(i.id) ? "Failed, retry" : made.has(i.id) ? "Redo" : "Make"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
