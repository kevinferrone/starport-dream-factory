// Sudoku with exactly one answer. 4x4 (2x2 boxes), 6x6 (2x3 boxes) or 9x9 (3x3 boxes).
import { rng, shuffle } from "./rng";

/** Grid size, box shape, and how many squares start filled in. */
export const SU_LEVELS: Record<number, { n: number; boxR: number; boxC: number; clues: number; pictures: boolean }> = {
  1: { n: 4, boxR: 2, boxC: 2, clues: 10, pictures: true },
  2: { n: 4, boxR: 2, boxC: 2, clues: 7, pictures: true },
  3: { n: 6, boxR: 2, boxC: 3, clues: 20, pictures: false },
  4: { n: 6, boxR: 2, boxC: 3, clues: 15, pictures: false },
  5: { n: 9, boxR: 3, boxC: 3, clues: 40, pictures: false },
  6: { n: 9, boxR: 3, boxC: 3, clues: 32, pictures: false },
  7: { n: 9, boxR: 3, boxC: 3, clues: 27, pictures: false },
};

export type Sudoku = { grade: number; n: number; boxR: number; boxC: number; pictures: boolean; puzzle: number[]; solution: number[] };

/** 0 = empty. Values run 1..n. Cells are row-major. */
export function makeSudoku(grade: number, seed: string | number): Sudoku {
  const L = SU_LEVELS[grade] ?? SU_LEVELS[1];
  const rand = rng(seed);
  const { n, boxR, boxC } = L;
  const solution = Array(n * n).fill(0);
  fill(solution, n, boxR, boxC, rand);

  const puzzle = [...solution];
  let filled = n * n;
  for (const i of shuffle([...Array(n * n).keys()], rand)) {
    if (filled <= L.clues) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions([...puzzle], n, boxR, boxC, 2) !== 1) puzzle[i] = keep;
    else filled--;
  }
  return { grade, n, boxR, boxC, pictures: L.pictures, puzzle, solution };
}

function ok(g: number[], n: number, boxR: number, boxC: number, i: number, v: number) {
  const r = Math.floor(i / n), c = i % n;
  for (let k = 0; k < n; k++) if (g[r * n + k] === v || g[k * n + c] === v) return false;
  const r0 = r - (r % boxR), c0 = c - (c % boxC);
  for (let y = 0; y < boxR; y++) for (let x = 0; x < boxC; x++) if (g[(r0 + y) * n + c0 + x] === v) return false;
  return true;
}

function fill(g: number[], n: number, boxR: number, boxC: number, rand: () => number): boolean {
  const i = g.indexOf(0);
  if (i < 0) return true;
  for (const v of shuffle([...Array(n).keys()].map((k) => k + 1), rand)) {
    if (!ok(g, n, boxR, boxC, i, v)) continue;
    g[i] = v;
    if (fill(g, n, boxR, boxC, rand)) return true;
    g[i] = 0;
  }
  return false;
}

/** Counts answers, stopping at `cap`. Tries the most constrained empty square first. */
function countSolutions(g: number[], n: number, boxR: number, boxC: number, cap: number): number {
  let best = -1, bestOpts: number[] = [];
  for (let i = 0; i < g.length; i++) {
    if (g[i]) continue;
    const opts: number[] = [];
    for (let v = 1; v <= n; v++) if (ok(g, n, boxR, boxC, i, v)) opts.push(v);
    if (!opts.length) return 0;
    if (best < 0 || opts.length < bestOpts.length) {
      best = i;
      bestOpts = opts;
      if (opts.length === 1) break;
    }
  }
  if (best < 0) return 1;
  let total = 0;
  for (const v of bestOpts) {
    g[best] = v;
    total += countSolutions(g, n, boxR, boxC, cap - total);
    g[best] = 0;
    if (total >= cap) break;
  }
  return total;
}

/** Squares that break a rule (same value twice in a row, column or box). */
export function conflicts(g: number[], n: number, boxR: number, boxC: number) {
  const bad = new Set<number>();
  for (let i = 0; i < g.length; i++) {
    if (!g[i]) continue;
    const v = g[i];
    g[i] = 0;
    if (!ok(g, n, boxR, boxC, i, v)) bad.add(i);
    g[i] = v;
  }
  return bad;
}
