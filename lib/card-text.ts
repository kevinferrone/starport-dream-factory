// The words on a card, in reading order. The card display, the PDF and the
// read-aloud all use this, so the highlighted word always matches the spoken word.
import type { Kind } from "@/lib/options";
import type { CreatureCard, EquipmentCard, PetCard, AnyCard } from "@/lib/generate";

export type Piece = {
  role: "title" | "desc" | "chip" | "ruleName" | "ruleText" | "note";
  text: string;
  icon?: string;
};

export function cardPieces(kind: Kind, card: AnyCard): Piece[] {
  const p: Piece[] = [
    { role: "title", text: card.name },
    { role: "desc", text: card.description },
  ];
  if (kind === "creature") {
    const c = card as CreatureCard;
    p.push({ role: "chip", icon: "🎯", text: `Difficulty ${c.difficulty}` });
    p.push({ role: "chip", icon: "⭐", text: `Successes to defeat ${c.successes}` });
    for (const a of c.abilities) {
      p.push({ role: "ruleName", text: a.name });
      p.push({ role: "ruleText", text: a.effect });
    }
    p.push({ role: "ruleName", text: `Special: ${c.special.name}` });
    p.push({ role: "ruleText", text: c.special.effect });
  } else if (kind === "equipment") {
    const e = card as EquipmentCard;
    p.push({ role: "chip", icon: "🪙", text: `Cost ${e.cost} ${e.cost === 1 ? "Coin" : "Coins"}` });
    p.push({ role: "chip", icon: e.type === "consumable" ? "✰" : "♾️", text: e.type === "consumable" ? "One-time use" : "Keep forever" });
    p.push({ role: "ruleText", text: e.effect });
    p.push({
      role: "note",
      text: e.uses_turn ? "Using this item takes your turn." : "Using this item does not take your turn.",
    });
  } else {
    const pet = card as PetCard;
    p.push({ role: "chip", icon: "🪙", text: `Cost ${pet.cost} ${pet.cost === 1 ? "Coin" : "Coins"}` });
    p.push({ role: "ruleName", text: "Bonus" });
    p.push({ role: "ruleText", text: pet.bonuses });
    p.push({ role: "ruleName", text: pet.power.name });
    p.push({ role: "ruleText", text: pet.power.effect });
    p.push({ role: "ruleName", text: "For the Guide" });
    p.push({ role: "note", text: pet.roleplay });
  }
  return p;
}

export const words = (text: string) => text.split(/\s+/).filter(Boolean);

/** Where each piece's first word sits in the card's overall word count. */
export function wordOffsets(pieces: Piece[]) {
  let n = 0;
  return pieces.map((p) => {
    const start = n;
    n += words(p.text).length;
    return start;
  });
}

/** The full script for the voice, with a pause after each piece. */
export function spokenText(pieces: Piece[]) {
  return pieces.map((p) => (/[.!?:]$/.test(p.text.trim()) ? p.text.trim() : `${p.text.trim()}.`)).join(" ");
}

export const allWords = (pieces: Piece[]) => pieces.flatMap((p) => words(p.text));
