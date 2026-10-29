"use client";

import { useEffect, useState } from "react";
import type { Kind } from "@/lib/options";

/** Steps the factory shows while a card builds. `at` = seconds after Build when the step starts. */
const STEPS = [
  { label: "Reading your picks", at: 0 },
  { label: "Writing the rules", at: 4 },
  { label: "Drawing the picture", at: 14 },
  { label: "Checking it's just right", at: 55 },
];

/**
 * The "factory moment" shown while a card builds: the kid's picks drop into the machine,
 * Flummox works inside, and four steps light up. The last step stays lit until the card is ready,
 * so it never claims to be done early. Motion stops for anyone who has reduced motion turned on.
 */
export default function FactoryScene({ kind, picks, drawing }: { kind: Kind; picks: string[]; drawing: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed((Date.now() - start) / 1000), 500);
    return () => clearInterval(t);
  }, []);

  let current = 0;
  STEPS.forEach((s, i) => {
    if (elapsed >= s.at) current = i;
  });
  const steps = drawing
    ? STEPS.map((s, i) => (i === 0 ? { ...s, label: "Looking at your drawing" } : s))
    : STEPS;
  const chips = (picks.length ? picks : ["Surprise!"]).slice(0, 3);

  return (
    <div className={`factory kind-${kind}`} role="status" aria-live="polite">
      <section className="factory-panel">
        <h2>{drawing ? "Bringing your drawing to life!" : "The Dream Factory is building!"}</h2>

        <div className="factory-machine" aria-hidden>
          <div className="factory-chips">
            {chips.map((c, i) => (
              <span key={c} className={`factory-chip c${i}`}>{c}</span>
            ))}
          </div>
          <div className="factory-hopper" />
          <div className="factory-body">
            <div className="factory-window">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/flummox.webp" alt="" />
            </div>
            <span className="factory-lamp l" />
            <span className="factory-lamp r" />
            <span className="factory-puff p1" />
            <span className="factory-puff p2" />
          </div>
          <Gear className="factory-gear g1" size={110} teeth={10} />
          <Gear className="factory-gear g2" size={82} teeth={8} />
          <div className="factory-belt" />
          <div className="factory-mini" />
        </div>

        <ol className="factory-steps">
          {steps.map((s, i) => (
            <li key={s.label} className={i < current ? "done" : i === current ? "now" : ""}>
              <span className="dot" aria-hidden>{i < current ? "✓" : i + 1}</span>
              {s.label}
            </li>
          ))}
        </ol>
        <p className="factory-note">Drawing the picture takes about a minute.</p>
      </section>
    </div>
  );
}

function Gear({ className, size, teeth }: { className: string; size: number; teeth: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="-50 -50 100 100" aria-hidden>
      <g>
        {Array.from({ length: teeth }, (_, i) => (
          <rect key={i} x={-7} y={-50} width={14} height={18} rx={3} transform={`rotate(${(i * 360) / teeth})`} />
        ))}
        <circle r={36} />
      </g>
      <circle r={13} fill="#ffffff" />
    </svg>
  );
}
