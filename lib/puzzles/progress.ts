// Puzzle Lab rules: points, badges, ranks and unlocks. Pure functions, safe anywhere.
// Change names or numbers here and everything else follows.

export type PuzzleKind = "wordsearch" | "sudoku" | "codebreaker";
export const GRADES = [1, 2, 3, 4, 5, 6, 7] as const;
export type Grade = (typeof GRADES)[number];

export const PUZZLES: Record<PuzzleKind, { title: string; spoken: string; icon: string; ready: boolean }> = {
  wordsearch: { title: "Word search", spoken: "Word search", icon: "🔎", ready: true },
  sudoku: { title: "Sudoku", spoken: "Sudoku", icon: "🧩", ready: true },
  codebreaker: { title: "Code breaker", spoken: "Code breaker", icon: "🔐", ready: false },
};

export const gradeLabel = (g: number) => ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th"][g] + " grade";

/**
 * Points for one solve: 2 x the grade level, or half that (the grade) if any hint was used.
 * If hints did more than half the puzzle, it earns no points (the kid still gets the "you solved it").
 * `total` = how many squares or words the kid had to find.
 */
export const pointsFor = (grade: number, hints: number, total = 0) =>
  total > 0 && hints * 2 > total ? 0 : hints > 0 ? grade : grade * 2;

/** Kindergarten (0) starts at grade 1; anything else maps straight across. */
export const gradeFromReadingLevel = (level: number | null | undefined): Grade =>
  Math.min(7, Math.max(1, level ?? 2)) as Grade;

export const RANKS = [
  { name: "Cadet", points: 0 },
  { name: "Explorer", points: 50 },
  { name: "Pathfinder", points: 150 },
  { name: "Navigator", points: 300 },
  { name: "Guide", points: 600 },
  { name: "Captain", points: 1000 },
  { name: "Star Captain", points: 1600 },
  { name: "Legend of Starport", points: 2400 },
];

/** Index into RANKS for a points total (0 = Cadet). Each rank above Cadet earns one bonus creation. */
export function rankIndex(points: number) {
  let i = 0;
  RANKS.forEach((r, j) => {
    if (points >= r.points) i = j;
  });
  return i;
}

export function rankInfo(points: number) {
  const i = rankIndex(points);
  const next = RANKS[i + 1];
  return {
    index: i,
    name: RANKS[i].name,
    next: next?.name ?? null,
    toNext: next ? next.points - points : 0,
    progress: next ? (points - RANKS[i].points) / (next.points - RANKS[i].points) : 1,
  };
}

type BadgeDef = { id: string; kind: PuzzleKind; name: string; how: string; test: (s: KindStats) => boolean };
export type KindStats = { solved: number; topGrade: number };

const set = (kind: PuzzleKind, names: [string, string, string, string]): BadgeDef[] => [
  { id: `${kind}-1`, kind, name: names[0], how: "Solve 1", test: (s) => s.solved >= 1 },
  { id: `${kind}-5`, kind, name: names[1], how: "Solve 5", test: (s) => s.solved >= 5 },
  { id: `${kind}-25`, kind, name: names[2], how: "Solve 25", test: (s) => s.solved >= 25 },
  { id: `${kind}-g7`, kind, name: names[3], how: "Solve a 7th-grade puzzle", test: (s) => s.topGrade >= 7 },
];

export const BADGES: BadgeDef[] = [
  ...set("wordsearch", ["Word Spotter", "Word Hunter", "Word Wizard", "Eagle Eye"]),
  ...set("sudoku", ["Grid Starter", "Pattern Finder", "Grid Master", "Logic Legend"]),
  ...set("codebreaker", ["Code Cracker", "Secret Keeper", "Master Decoder", "Cipher Champion"]),
];

export function earnedBadges(stats: Partial<Record<PuzzleKind, KindStats>>) {
  return BADGES.filter((b) => b.test(stats[b.kind] ?? { solved: 0, topGrade: 0 }));
}

// ---- Unlocks: puzzles open up as the family builds cards. ----

export type BuildStats = { total: number; kinds: Set<string> };

/** Card rows are never removed (deleting only hides them), so nothing ever locks again. */
export function unlocks(b: BuildStats) {
  const need = (n: number) => Math.max(0, n - b.total);
  const missing = ["creature", "equipment", "pet"].filter((k) => !b.kinds.has(k));
  const words: Record<string, string> = { creature: "a creature", equipment: "an equipment card", pet: "a pet" };
  const more = (n: number) => `Build ${n} more card${n === 1 ? "" : "s"} to unlock`;
  return {
    sudoku: { open: b.total >= 1, progress: b.total >= 1 ? "" : "Build your first card to unlock" },
    wordsearch: { open: b.total >= 3, progress: b.total >= 3 ? "" : more(need(3)) },
    codebreaker: {
      open: missing.length === 0,
      progress: missing.length === 0 ? "" : `Make ${missing.map((k) => words[k]).join(" and ")} to unlock`,
    },
    tenCards: { open: b.total >= 10, progress: b.total >= 10 ? "" : more(need(10)) },
    masterBuilder: { open: b.total >= 20, progress: b.total >= 20 ? "" : more(need(20)) },
  } satisfies Record<string, { open: boolean; progress: string }>;
}
