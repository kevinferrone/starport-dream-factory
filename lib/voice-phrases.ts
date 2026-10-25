import { GROUPS, KINDS, DIFFICULTY_MIN, DIFFICULTY_MAX, difficultyFace, allOptions, type Kind } from "@/lib/options";

/** What the home tiles say out loud. */
export const KIND_SPOKEN: Record<Kind, string> = { creature: "Creature", equipment: "Equipment", pet: "Pet" };

/** Fixed things the app says. */
export const PHRASES = {
  readAloudOn: "Read aloud is on",
  building: "Building!",
  shaking: "Shaking up the stats",
  saved: "Saved!",
  changeButtons: "Change my buttons",
  home: "Home",
  myCards: "My cards",
  grownUps: "Grown-ups",
  print: "Print",
  pdf: "Download PDF",
};

export const pickFirst = (title: string) => `Pick ${title.toLowerCase()} first`;
export const difficultyPhrase = (d: number) => `${difficultyFace(d).label}, ${d}`;

/** Every phrase the voice is allowed to say. The voice service refuses anything else. */
export function allowedPhrases(): Set<string> {
  const s = new Set<string>(Object.values(PHRASES));
  Object.values(KIND_SPOKEN).forEach((p) => s.add(p));
  (Object.keys(KINDS) as Kind[]).forEach((k) => {
    s.add(KINDS[k].button);
    GROUPS[k].forEach((g) => {
      s.add(pickFirst(g.title));
      allOptions(g).forEach((o) => s.add(o.label));
    });
  });
  for (let d = DIFFICULTY_MIN; d <= DIFFICULTY_MAX; d++) s.add(difficultyPhrase(d));
  return s;
}
