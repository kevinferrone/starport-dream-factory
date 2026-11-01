"use client";

import Link from "next/link";
import { useState } from "react";
import { GRADES, gradeLabel, type PuzzleKind } from "@/lib/puzzles/progress";
import { speak } from "@/components/ReadAloud";
import { P } from "@/lib/puzzles/phrases";

export type SolveResult = {
  points: number;
  totalPoints: number;
  rank: { name: string };
  rankUp: { name: string; bonus: boolean } | null;
  newBadges: string[];
  capped?: boolean;
  helped?: boolean;
};

/** Grade buttons 1-7. */
export function LevelPicker({ grade, onPick }: { grade: number; onPick: (g: number) => void }) {
  return (
    <div className="level-picker" role="group" aria-label="Pick a level">
      {GRADES.map((g) => (
        <button
          key={g}
          type="button"
          aria-pressed={g === grade}
          onMouseEnter={() => speak(gradeLabel(g))}
          onClick={() => onPick(g)}
        >
          {g}
          <span className="sr-only"> ({gradeLabel(g)})</span>
        </button>
      ))}
      <span className="level-label">{gradeLabel(grade)}</span>
    </div>
  );
}

/** Saves a solve and returns what was earned. */
export function useSolve(kind: PuzzleKind) {
  const [result, setResult] = useState<SolveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = async (grade: number, hints: number, total: number) => {
    setError(null);
    try {
      const res = await fetch("/api/puzzles/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, grade, hints, total }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save that one.");
      setResult(data);
      const said = data.capped || data.helped
        ? P.done
        : data.rankUp
        ? P.rankUp(data.rankUp.name, data.rankUp.bonus)
        : data.newBadges?.length
          ? P.badge(data.newBadges[0])
          : P.solved(Math.max(1, data.points));
      speak(said);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that one.");
    }
  };
  return { result, error, submit, reset: () => setResult(null) };
}

/** The "you did it" card shown after a solve. */
export function Celebration({ result, onAgain }: { result: SolveResult; onAgain: () => void }) {
  return (
    <div className="celebrate panel" role="status">
      <div className="celebrate-burst" aria-hidden>🎉</div>
      <h2>You solved it!</h2>
      {result.capped ? (
        <p>That&apos;s a lot of puzzles today! Points start again tomorrow.</p>
      ) : result.helped ? (
        <p>Hints did most of this one. Try it with fewer hints to earn points!</p>
      ) : (
        <p className="celebrate-points">
          +{result.points} point{result.points === 1 ? "" : "s"} · {result.totalPoints} total
        </p>
      )}
      {result.rankUp && (
        <p className="celebrate-rank">
          <span aria-hidden>🚀</span> New rank: <strong>{result.rankUp.name}</strong>
          {result.rankUp.bonus && <> · You earned a <strong>bonus creation</strong>!</>}
        </p>
      )}
      {result.newBadges.map((b) => (
        <p key={b} className="celebrate-badge">
          <span aria-hidden>🏅</span> New badge: <strong>{b}</strong>
        </p>
      ))}
      <div className="actions">
        <button className="big-btn small mint" type="button" onClick={onAgain}>
          <span className="emoji" aria-hidden>🔁</span> Play again
        </button>
        <Link className="big-btn small plain" href="/puzzles">
          Back to Puzzle Lab
        </Link>
      </div>
    </div>
  );
}
