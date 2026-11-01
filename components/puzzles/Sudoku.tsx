"use client";

import { useEffect, useMemo, useState } from "react";
import { makeSudoku, conflicts } from "@/lib/puzzles/sudoku";
import { LevelPicker, useSolve, Celebration } from "./PuzzleShell";
import { speak, speakName } from "@/components/ReadAloud";

type Pic = { src: string; name: string; cardId?: string };

export default function Sudoku({ pictures, startGrade }: { pictures: Pic[]; startGrade: number }) {
  const [grade, setGrade] = useState(startGrade);
  const [seed, setSeed] = useState(() => Math.random().toString(36).slice(2));
  const p = useMemo(() => makeSudoku(grade, seed), [grade, seed]);
  const [cells, setCells] = useState<number[]>(p.puzzle);
  const [notes, setNotes] = useState<number[][]>(() => p.puzzle.map(() => []));
  const [sel, setSel] = useState<number | null>(null);
  const [pencil, setPencil] = useState(false);
  const [checked, setChecked] = useState(false);
  const [hints, setHints] = useState(0);
  const { result, error, submit, reset } = useSolve("sudoku");

  useEffect(() => {
    setCells(p.puzzle);
    setNotes(p.puzzle.map(() => []));
    setSel(null);
    setChecked(false);
    setHints(0);
    reset();
  }, [p]); // eslint-disable-line react-hooks/exhaustive-deps

  const given = (i: number) => p.puzzle[i] !== 0;
  const bad = useMemo(() => (checked ? conflictsOrWrong() : new Set<number>()), [checked, cells]); // eslint-disable-line react-hooks/exhaustive-deps
  function conflictsOrWrong() {
    const s = conflicts([...cells], p.n, p.boxR, p.boxC);
    cells.forEach((v, i) => v && v !== p.solution[i] && s.add(i));
    return s;
  }

  const put = (v: number) => {
    if (sel === null || given(sel)) return;
    if (pencil && v) {
      setNotes((ns) => ns.map((n, i) => (i === sel ? (n.includes(v) ? n.filter((x) => x !== v) : [...n, v].sort()) : n)));
      return;
    }
    const next = cells.map((x, i) => (i === sel ? v : x));
    setCells(next);
    setChecked(false);
    const pic = v && p.pictures ? pictures[v - 1] : null;
    if (pic) (pic.cardId ? speakName(pic.cardId, pic.name) : speak(pic.name));
    if (next.every((x, i) => x === p.solution[i])) submit(grade, hints);
  };

  const hint = () => {
    const empties = cells.map((v, i) => (v !== p.solution[i] ? i : -1)).filter((i) => i >= 0);
    if (!empties.length) return;
    const i = sel !== null && empties.includes(sel) ? sel : empties[Math.floor(Math.random() * empties.length)];
    const next = cells.map((x, j) => (j === i ? p.solution[i] : x));
    setCells(next);
    setHints((h) => h + 1);
    setSel(i);
    if (next.every((x, j) => x === p.solution[j])) submit(grade, hints + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sel === null) return;
      const n = Number(e.key);
      if (n >= 1 && n <= p.n) put(n);
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") put(0);
      else if (e.key.startsWith("Arrow")) {
        const r = Math.floor(sel / p.n), c = sel % p.n;
        const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key]!;
        const nr = (r + d[0] + p.n) % p.n, nc = (c + d[1] + p.n) % p.n;
        setSel(nr * p.n + nc);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const face = (v: number) =>
    p.pictures && pictures[v - 1] ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={pictures[v - 1].src} alt={pictures[v - 1].name} />
    ) : (
      String(v)
    );

  const selVal = sel !== null ? cells[sel] : 0;

  return (
    <div className="puzzle-wrap">
      <LevelPicker grade={grade} onPick={(g) => setGrade(g)} />
      {result ? (
        <Celebration result={result} onAgain={() => setSeed(Math.random().toString(36).slice(2))} />
      ) : (
        <div className="su-layout">
          <p className="su-instructions">
            {p.pictures
              ? "Put each picture once in every row, column and box."
              : `Put 1 to ${p.n} once in every row, column and box.`}
            {hints > 0 && ` Hints used: ${hints} (half points).`}
          </p>
          <div className={`su-grid n${p.n}${p.pictures ? " pics" : ""}`} style={{ ["--n" as string]: p.n, ["--br" as string]: p.boxR, ["--bc" as string]: p.boxC }}>
            {cells.map((v, i) => {
              const r = Math.floor(i / p.n), c = i % p.n;
              const edgeR = (c + 1) % p.boxC === 0 && c < p.n - 1;
              const edgeB = (r + 1) % p.boxR === 0 && r < p.n - 1;
              const same = selVal && v === selVal;
              const cls = [
                "su-cell",
                given(i) ? "given" : "",
                sel === i ? "sel" : "",
                same ? "same" : "",
                bad.has(i) ? "bad" : "",
                edgeR ? "edge-r" : "",
                edgeB ? "edge-b" : "",
              ].join(" ");
              return (
                <button key={i} type="button" className={cls} onClick={() => setSel(i)} aria-label={`Row ${r + 1}, column ${c + 1}${v ? `: ${v}` : ", empty"}`}>
                  {v ? face(v) : notes[i].length ? <span className="su-notes">{notes[i].join(" ")}</span> : ""}
                </button>
              );
            })}
          </div>

          <div className="su-pad" role="group" aria-label="Pick a value">
            {Array.from({ length: p.n }, (_, k) => k + 1).map((v) => (
              <button key={v} type="button" className="su-key" onClick={() => put(v)}>
                {face(v)}
              </button>
            ))}
            <button type="button" className="su-key erase" onClick={() => put(0)} aria-label="Erase">
              ⌫
            </button>
          </div>

          <div className="actions">
            <button className="big-btn small plain" type="button" onClick={() => setChecked(true)}>
              <span className="emoji" aria-hidden>✅</span> Check
            </button>
            <button className="big-btn small plain" type="button" onClick={hint}>
              <span className="emoji" aria-hidden>💡</span> Hint
            </button>
            {grade >= 3 && (
              <button className="big-btn small plain" type="button" aria-pressed={pencil} onClick={() => setPencil((x) => !x)}>
                <span className="emoji" aria-hidden>✏️</span> {pencil ? "Notes on" : "Notes off"}
              </button>
            )}
            <button className="big-btn small plain" type="button" onClick={() => setSeed(Math.random().toString(36).slice(2))}>
              <span className="emoji" aria-hidden>🔁</span> New puzzle
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}
