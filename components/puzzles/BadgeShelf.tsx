import Link from "next/link";
import { BADGES, PUZZLES, RANKS } from "@/lib/puzzles/progress";

type Props = {
  points: number;
  rank: { index: number; name: string; next: string | null; toNext: number; progress: number };
  earned: { id: string }[];
  /** Compact = the strip on My cards; full = every badge, earned or not, in Puzzle Lab. */
  compact?: boolean;
};

const MEDAL = ["🛰️", "🧭", "🥾", "🗺️", "🔭", "🚀", "🌟", "👑"];

/** Rank, progress to the next rank, and badges. */
export default function BadgeShelf({ points, rank, earned, compact }: Props) {
  const have = new Set(earned.map((b) => b.id));
  const list = compact ? BADGES.filter((b) => have.has(b.id)) : BADGES.filter((b) => PUZZLES[b.kind].ready);
  return (
    <section className={`badge-shelf${compact ? " compact" : ""}`} aria-label="Puzzle rank and badges">
      <div className="rank">
        <span className="rank-medal" aria-hidden>{MEDAL[rank.index] ?? "⭐"}</span>
        <div className="rank-text">
          <strong>{rank.name}</strong>
          <span>
            {points} puzzle point{points === 1 ? "" : "s"}
            {rank.next ? ` · ${rank.toNext} to ${rank.next}` : " · top rank!"}
          </span>
          {rank.next && (
            <span className="rank-bar" aria-hidden>
              <span style={{ width: `${Math.round(rank.progress * 100)}%` }} />
            </span>
          )}
        </div>
        {compact && (
          <Link className="big-btn small" href="/puzzles">
            <span className="emoji" aria-hidden>🧩</span> Puzzle Lab
          </Link>
        )}
      </div>
      {!compact && (
        <ol className="rank-ladder" aria-label="All ranks">
          {RANKS.map((r, i) => (
            <li key={r.name} className={i < rank.index ? "past" : i === rank.index ? "now" : "next"} aria-current={i === rank.index ? "step" : undefined}>
              <span className="rl-medal" aria-hidden>{MEDAL[i] ?? "⭐"}</span>
              <span className="rl-name">{r.name}</span>
              <span className="rl-pts">{i === rank.index ? "You are here" : `${r.points} pts`}</span>
            </li>
          ))}
        </ol>
      )}
      {list.length > 0 && (
        <ul className="badges">
          {list.map((b) => (
            <li key={b.id} className={have.has(b.id) ? "on" : "off"} title={have.has(b.id) ? b.name : `${b.name}: ${b.how}`}>
              <span className="badge-icon" aria-hidden>{have.has(b.id) ? PUZZLES[b.kind].icon : "🔒"}</span>
              <span className="badge-name">{b.name}</span>
              {!compact && !have.has(b.id) && <span className="badge-how">{b.how}</span>}
            </li>
          ))}
        </ul>
      )}
      {!compact && (
        <p className="hint" style={{ margin: "10px 0 0" }}>
          Every new rank gives your family a bonus creation. {RANKS.length - 1 - rank.index > 0 ? `${RANKS.length - 1 - rank.index} more to earn.` : "You've earned them all!"}
        </p>
      )}
    </section>
  );
}
