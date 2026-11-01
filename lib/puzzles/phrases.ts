// Everything Puzzle Lab says out loud, so the warm Dream Factory voice can record it.
// (Card names are dynamic and go through /api/name-voice instead.)
import { BADGES, GRADES, PUZZLES, RANKS, gradeLabel } from "./progress";
import { FILLER_WORDS } from "./wordsearch";

export const fillerLabel = (w: string) => w[0] + w.slice(1).toLowerCase();

/** Starport's own pictures used in sudoku when a kid has fewer than 4 cards. */
export const STARTER_PICTURES = [
  { src: "/tiles/creature.webp", name: "Troll" },
  { src: "/tiles/equipment.webp", name: "Backpack" },
  { src: "/tiles/pet.webp", name: "Monkey" },
  { src: "/flummox.webp", name: "Flummox" },
];

export const P = {
  lab: "Puzzle Lab",
  puzzles: "Puzzles",
  lookFor: "Look for this one!",
  done: "You solved it!",
  solved: (points: number) => `You solved it! ${points} ${points === 1 ? "point" : "points"}!`,
  rankUp: (rank: string, bonus: boolean) => `You solved it! You're a ${rank} now!${bonus ? " You earned a bonus creation!" : ""}`,
  badge: (name: string) => `You solved it! New badge: ${name}!`,
};

export function puzzlePhrases(): string[] {
  const s = new Set<string>([P.lab, P.puzzles, P.lookFor, P.done]);
  Object.values(PUZZLES).forEach((p) => s.add(p.spoken));
  GRADES.forEach((g) => s.add(gradeLabel(g)));
  FILLER_WORDS.forEach((w) => s.add(fillerLabel(w)));
  STARTER_PICTURES.forEach((p) => s.add(p.name));
  for (let pts = 1; pts <= 7; pts++) s.add(P.solved(pts));
  RANKS.slice(1).forEach((r) => {
    s.add(P.rankUp(r.name, true));
    s.add(P.rankUp(r.name, false));
  });
  BADGES.forEach((b) => s.add(P.badge(b.name)));
  return [...s];
}
