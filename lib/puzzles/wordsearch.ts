// Creature word search: the hidden words are the names of the kid's own cards.
import { rng, shuffle } from "./rng";

type Dir = [number, number];
const RIGHT: Dir = [0, 1], DOWN: Dir = [1, 0], DOWN_RIGHT: Dir = [1, 1], UP_RIGHT: Dir = [-1, 1];
const LEFT: Dir = [0, -1], UP: Dir = [-1, 0], DOWN_LEFT: Dir = [1, -1], UP_LEFT: Dir = [-1, -1];

const STRAIGHT = [RIGHT, DOWN];
const DIAG = [DOWN_RIGHT, UP_RIGHT, DOWN_LEFT, UP_LEFT];
const BACK = [LEFT, UP];

/**
 * Grid size, how many words, which directions (repeat a direction to make it more common),
 * longest word, and how hard to push words to cross on a shared letter (0 = never cross).
 */
export const WS_LEVELS: Record<number, { size: number; words: number; dirs: Dir[]; maxLen: number; cross: number }> = {
  1: { size: 8, words: 4, dirs: [RIGHT, DOWN], maxLen: 8, cross: 0 },
  2: { size: 9, words: 6, dirs: [RIGHT, DOWN], maxLen: 9, cross: 0 },
  3: { size: 10, words: 8, dirs: [RIGHT, DOWN, DOWN_RIGHT], maxLen: 10, cross: 0 },
  4: { size: 12, words: 10, dirs: [...STRAIGHT, DOWN_RIGHT, DOWN_RIGHT, UP_RIGHT, UP_RIGHT], maxLen: 12, cross: 1 },
  5: { size: 13, words: 12, dirs: [...STRAIGHT, ...BACK, ...DIAG, ...DIAG], maxLen: 14, cross: 2 },
  6: { size: 14, words: 14, dirs: [...STRAIGHT, ...BACK, ...BACK, ...DIAG, ...DIAG], maxLen: 14, cross: 3 },
  7: { size: 15, words: 16, dirs: [RIGHT, DOWN, ...BACK, ...BACK, ...DIAG, ...DIAG, ...DIAG], maxLen: 15, cross: 3 },
};

/** Most card names the search ever uses (the 7th-grade maximum). */
export const MAX_CARD_WORDS = 16;

/** Starport words that fill in when a kid doesn't have enough cards yet. */
export const FILLER_WORDS = [
  "TOKEN", "COINS", "GUIDE", "PET", "ROLL", "DICE", "QUEST", "MAP", "STARPORT", "ADVENTURE",
  "BARDO", "TRAIT", "CREATURE", "PLAYER", "MAGIC", "DREAM", "FRIEND", "TREASURE", "PUZZLE", "SPELL",
];

export type CardWord = { cardId: string; name: string; imageUrl: string | null; kind: string };
export type PlacedWord = {
  word: string;
  label: string;
  cardId: string | null;
  imageUrl: string | null;
  kind: string | null;
  cells: [number, number][];
};
export type WordSearch = { grade: number; size: number; grid: string[][]; words: PlacedWord[]; fillers: number };

const letters = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");

/** The word a card contributes: its whole name, or its longest word if the name won't fit. */
export function wordForName(name: string, maxLen: number): string | null {
  const whole = letters(name);
  if (whole.length >= 3 && whole.length <= maxLen) return whole;
  const parts = name.split(/[\s-]+/).map(letters).filter((p) => p.length >= 3 && p.length <= maxLen);
  if (!parts.length) return null;
  return parts.sort((a, b) => b.length - a.length)[0];
}

/** Builds a word search from a random mix of the family's cards (a new mix every puzzle). */
export function makeWordSearch(cards: CardWord[], grade: number, seed: string | number, limit?: number): WordSearch {
  const L = WS_LEVELS[grade] ?? WS_LEVELS[2];
  const want = Math.max(1, limit ?? L.words);
  const rand = rng(seed);

  const picked: Omit<PlacedWord, "cells">[] = [];
  const seen = new Set<string>();
  for (const c of shuffle(cards, rand)) {
    if (picked.length >= want) break;
    const w = wordForName(c.name, Math.min(L.maxLen, L.size));
    if (!w || seen.has(w)) continue;
    seen.add(w);
    picked.push({ word: w, label: c.name, cardId: c.cardId, imageUrl: c.imageUrl, kind: c.kind });
  }
  let fillers = 0;
  for (const f of shuffle(FILLER_WORDS, rand)) {
    if (picked.length >= want) break;
    if (f.length > Math.min(L.maxLen, L.size) || seen.has(f)) continue;
    seen.add(f);
    fillers++;
    picked.push({ word: f, label: f[0] + f.slice(1).toLowerCase(), cardId: null, imageUrl: null, kind: null });
  }

  // Longest first places most reliably. A few full retries in the rare case a grid jams.
  for (let attempt = 0; attempt < 30; attempt++) {
    const grid: string[][] = Array.from({ length: L.size }, () => Array(L.size).fill(""));
    const dirsAt: Dir[][][] = Array.from({ length: L.size }, () => Array.from({ length: L.size }, () => []));
    const placed: PlacedWord[] = [];
    let ok = true;
    for (const p of [...picked].sort((a, b) => b.word.length - a.word.length)) {
      const cells = place(grid, dirsAt, p.word, L, rand);
      if (!cells) {
        ok = false;
        break;
      }
      placed.push({ ...p, cells });
    }
    if (!ok) continue;
    const A = "ABCDEFGHIJKLMNOPRSTUVWY"; // no Q, X, Z: fewer confusing near-words for little readers
    for (const row of grid) for (let c = 0; c < row.length; c++) if (!row[c]) row[c] = A[Math.floor(rand() * A.length)];
    // Show cards first (newest first), then filler words.
    const order = new Map(picked.map((p, i) => [p.word, i]));
    placed.sort((a, b) => order.get(a.word)! - order.get(b.word)!);
    return { grade, size: L.size, grid, words: placed, fillers };
  }
  // Fall back to fewer words rather than fail.
  return makeWordSearch(cards, grade, `${seed}-x`, want - 1);
}

/**
 * Tries lots of spots for a word and keeps the best one. On older grades the best spot is the one
 * that crosses other words on a shared letter, so kids can't just scan the open spaces.
 * Words only cross at an angle (never lying along another word), so every word stays findable.
 */
function place(grid: string[][], dirsAt: Dir[][][], word: string, L: (typeof WS_LEVELS)[number], rand: () => number) {
  const n = grid.length;
  // Pick the direction first (so diagonals and backwards really show up), then fall back to others.
  const order: Dir[] = [];
  for (const d of shuffle(L.dirs, rand)) if (!order.includes(d)) order.push(d);
  for (const dir of order) {
    const [dr, dc] = dir;
    let best: { cells: [number, number][]; score: number } | null = null;
    // Every start square where the word fits on the board, in random order.
    const starts: [number, number][] = [];
    for (let r0 = 0; r0 < n; r0++)
      for (let c0 = 0; c0 < n; c0++) {
        const r1 = r0 + dr * (word.length - 1), c1 = c0 + dc * (word.length - 1);
        if (r1 >= 0 && r1 < n && c1 >= 0 && c1 < n) starts.push([r0, c0]);
      }
    for (const [r0, c0] of shuffle(starts, rand)) {
      const cells: [number, number][] = [];
      let fits = true;
      let shared = 0;
      for (let i = 0; i < word.length; i++) {
        const r = r0 + dr * i, c = c0 + dc * i;
        const there = grid[r][c];
        if (there) {
          // Share a letter only if crossing is on, the letter matches, and the other word runs a different way.
          const parallel = dirsAt[r][c].some(([a, b]) => (a === dr && b === dc) || (a === -dr && b === -dc));
          if (!L.cross || there !== word[i] || parallel) {
            fits = false;
            break;
          }
          shared++;
        }
        cells.push([r, c]);
      }
      if (!fits || shared >= word.length) continue;
      if (!L.cross) return commit(grid, dirsAt, word, cells, dir);
      const score = shared * L.cross + rand();
      if (!best || score > best.score) best = { cells, score };
    }
    if (best) return commit(grid, dirsAt, word, best.cells, dir);
  }
  return null;
}

function commit(grid: string[][], dirsAt: Dir[][][], word: string, cells: [number, number][], dir: Dir) {
  cells.forEach(([r, c], i) => {
    grid[r][c] = word[i];
    dirsAt[r][c].push(dir);
  });
  return cells;
}

/** True if the dragged line from a to b covers exactly this word (either direction). */
export function matches(w: PlacedWord, a: [number, number], b: [number, number]) {
  const first = w.cells[0], last = w.cells[w.cells.length - 1];
  const same = (x: [number, number], y: [number, number]) => x[0] === y[0] && x[1] === y[1];
  return (same(first, a) && same(last, b)) || (same(first, b) && same(last, a));
}

/** How many of the family's cards have no name (or name word) short enough for this grade's grid. */
export function tooLongCount(cards: CardWord[], grade: number) {
  const L = WS_LEVELS[grade] ?? WS_LEVELS[2];
  return cards.filter((c) => !wordForName(c.name, Math.min(L.maxLen, L.size))).length;
}
