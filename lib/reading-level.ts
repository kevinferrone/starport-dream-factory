// Parents choose the grade level the card writing should match.
export const READING_LEVELS = [
  { value: 0, label: "Kindergarten" },
  { value: 1, label: "1st grade" },
  { value: 2, label: "2nd grade" },
  { value: 3, label: "3rd grade" },
  { value: 4, label: "4th grade" },
  { value: 5, label: "5th grade" },
  { value: 6, label: "6th grade" },
  { value: 7, label: "7th grade and up" },
];

export const DEFAULT_READING_LEVEL = 3;

export function readingLevelLabel(level: number | null | undefined) {
  return READING_LEVELS.find((l) => l.value === (level ?? DEFAULT_READING_LEVEL))!.label;
}

/** Writing guidance for the AI at each level. Game words (Difficulty, Sneaky roll, tokens) always stay. */
export function readingGuide(level: number | null | undefined) {
  const l = level ?? DEFAULT_READING_LEVEL;
  const who = readingLevelLabel(l);
  const style =
    l <= 0
      ? "very short sentences of 3 to 7 words, simple one-syllable words wherever possible, nothing tricky to sound out"
      : l === 1
      ? "short sentences of 5 to 8 words using common, easy-to-decode words"
      : l <= 3
      ? "short, clear sentences of about 8 to 12 words using everyday words"
      : l <= 5
      ? "clear sentences with some fun, interesting vocabulary a confident reader enjoys"
      : "lively, full sentences with rich vocabulary, wordplay and puns";
  return `READING LEVEL: The child reading this card is at a ${who} reading level. Write the name, description and every rules sentence for that reader: ${style}. Keep Starport game words exactly as they are (Difficulty, successes, tokens, Smart/Sneaky/Tough/Helpful roll, Coins, turn) and keep the rules just as clear and complete.`;
}

/** How fast "Read my card" plays: much slower for K–2, a little slower for 3rd–4th, normal for 5th and up. */
export function readingRate(level: number | null | undefined) {
  const l = level ?? DEFAULT_READING_LEVEL;
  if (l <= 2) return 0.72;
  if (l <= 4) return 0.86;
  return 1;
}
