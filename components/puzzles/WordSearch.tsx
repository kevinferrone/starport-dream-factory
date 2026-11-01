"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { makeWordSearch, matches, type CardWord } from "@/lib/puzzles/wordsearch";
import { LevelPicker, useSolve, Celebration } from "./PuzzleShell";
import { speak, speakName, warmNames, warmVoices } from "@/components/ReadAloud";
import { gradeLabel } from "@/lib/puzzles/progress";
import { P } from "@/lib/puzzles/phrases";
import type { PlacedWord } from "@/lib/puzzles/wordsearch";

type Cell = [number, number];

/** Cells on the straight line from a to b, or null if it isn't straight (across, down or diagonal). */
function line(a: Cell, b: Cell): Cell[] | null {
  const dr = b[0] - a[0], dc = b[1] - a[1];
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const sr = Math.sign(dr), sc = Math.sign(dc);
  return Array.from({ length: steps + 1 }, (_, i) => [a[0] + sr * i, a[1] + sc * i] as Cell);
}

/** Says exactly the word shown in the list (e.g. just "Troll" when the grid uses TROLL). */
const say = (w: PlacedWord) =>
  w.cardId ? speakName(w.cardId, w.word.charAt(0) + w.word.slice(1).toLowerCase(), w.word) : speak(w.label);

export default function WordSearch({ cards, startGrade }: { cards: CardWord[]; startGrade: number }) {
  const [grade, setGrade] = useState(startGrade);
  const [seed, setSeed] = useState(() => Math.random().toString(36).slice(2));
  const puzzle = useMemo(() => makeWordSearch(cards, grade, seed), [cards, grade, seed]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [start, setStart] = useState<Cell | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const [hints, setHints] = useState(0);
  const [flash, setFlash] = useState<Cell | null>(null);
  const dragging = useRef(false);
  const { result, error, submit, reset } = useSolve("wordsearch");
  const littles = grade <= 2;

  // Download every word's voice as soon as the puzzle appears, so taps speak instantly.
  useEffect(() => {
    warmNames(puzzle.words.filter((w) => w.cardId).map((w) => ({ cardId: w.cardId!, word: w.word })));
    warmVoices([
      ...puzzle.words.filter((w) => !w.cardId).map((w) => w.label),
      P.lookFor,
      P.done,
      P.solved(grade),
      P.solved(Math.ceil(grade / 2)),
      ...[1, 2, 3, 4, 5, 6, 7].map(gradeLabel),
    ]);
  }, [puzzle, grade]);

  useEffect(() => {
    setFound(new Set());
    setStart(null);
    setHover(null);
    setHints(0);
    reset();
  }, [puzzle]); // eslint-disable-line react-hooks/exhaustive-deps

  const foundCells = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of puzzle.words) if (found.has(w.word)) for (const [r, c] of w.cells) m.set(`${r},${c}`, w.kind ?? "filler");
    return m;
  }, [found, puzzle]);

  const preview = useMemo(() => {
    if (!start) return new Set<string>();
    const cells = hover ? line(start, hover) : [start];
    return new Set((cells ?? [start]).map(([r, c]) => `${r},${c}`));
  }, [start, hover]);

  const tryWord = (a: Cell, b: Cell) => {
    const w = puzzle.words.find((x) => !found.has(x.word) && matches(x, a, b));
    if (w) {
      const next = new Set(found).add(w.word);
      setFound(next);
      if (next.size === puzzle.words.length) submit(grade, hints);
      else say(w);
    }
    setStart(null);
    setHover(null);
  };

  const cellFromPoint = (x: number, y: number): Cell | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const rc = el?.dataset?.rc;
    if (!rc) return null;
    const [r, c] = rc.split(",").map(Number);
    return [r, c];
  };

  const onDown = (e: React.PointerEvent, cell: Cell) => {
    e.preventDefault();
    if (start && !dragging.current) {
      // Second tap of tap-tap mode.
      tryWord(start, cell);
      return;
    }
    dragging.current = true;
    setStart(cell);
    setHover(cell);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell) setHover(cell);
  };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (start && hover && (start[0] !== hover[0] || start[1] !== hover[1])) tryWord(start, hover);
    // A single tap leaves the first letter picked; the next tap finishes the word.
  };

  const hint = () => {
    const left = puzzle.words.filter((w) => !found.has(w.word));
    if (!left.length) return;
    const w = left[Math.floor(Math.random() * left.length)];
    setHints((h) => h + 1);
    setFlash(w.cells[0]);
    speak(P.lookFor);
    setTimeout(() => setFlash(null), 2500);
  };

  const fillersNote = puzzle.fillers > 0;

  return (
    <div className="puzzle-wrap">
      <LevelPicker grade={grade} onPick={(g) => setGrade(g)} />

      {result ? (
        <Celebration result={result} onAgain={() => setSeed(Math.random().toString(36).slice(2))} />
      ) : (
        <div className="ws-layout">
          <div
            className="ws-grid"
            style={{ ["--n" as string]: puzzle.size }}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={() => dragging.current && onUp()}
          >
            {puzzle.grid.map((row, r) =>
              row.map((ch, c) => {
                const key = `${r},${c}`;
                const kind = foundCells.get(key);
                const cls = [
                  "ws-cell",
                  kind ? `found ${kind}` : "",
                  preview.has(key) ? "picking" : "",
                  flash && flash[0] === r && flash[1] === c ? "flash" : "",
                ].join(" ");
                return (
                  <button key={key} type="button" className={cls} data-rc={key} onPointerDown={(e) => onDown(e, [r, c])} aria-label={ch}>
                    {ch}
                  </button>
                );
              })
            )}
          </div>

          <aside className="ws-words" aria-label="Words to find">
            <h2>
              Find {puzzle.words.length} words <span className="count">({found.size} found)</span>
            </h2>
            <ul>
              {puzzle.words.map((w) => (
                <li key={w.word} className={`${found.has(w.word) ? "done" : ""} ${w.kind ?? "filler"}`}>
                  <button type="button" onClick={() => say(w)} title="Hear it">
                    {w.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.imageUrl} alt="" />
                    ) : (
                      <span className="ws-dot" aria-hidden>★</span>
                    )}
                    <span className="ws-word">{w.word}</span>
                  </button>
                </li>
              ))}
            </ul>
            {littles && <p className="hint">Tap a word to hear it, then find it!</p>}
            {fillersNote && (
              <p className="hint">
                <span aria-hidden>✨</span> Make more cards to fill your search with your own creations!
              </p>
            )}
            <div className="actions">
              <button className="big-btn small plain" type="button" onClick={hint}>
                <span className="emoji" aria-hidden>💡</span> Hint
              </button>
              <button className="big-btn small plain" type="button" onClick={() => setSeed(Math.random().toString(36).slice(2))}>
                <span className="emoji" aria-hidden>🔁</span> New puzzle
              </button>
            </div>
            {hints > 0 && <p className="hint">Hints used: {hints} (half points)</p>}
            {error && <p className="error">{error}</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
