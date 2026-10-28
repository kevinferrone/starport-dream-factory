// Turning what someone typed into the card editor into a safe, complete card.
// Used by the editor (live preview) and by the server (the real check).
import type { Kind } from "@/lib/options";
import type { AnyCard, CreatureCard, EquipmentCard, PetCard } from "@/lib/generate";

export const LIMITS = { name: 60, description: 300, ruleName: 60, rule: 400, bonuses: 200 };

const text = (v: unknown, max: number, fallback: string) => {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
  return s || fallback;
};
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const named = (v: unknown, old: { name: string; effect: string }) => {
  const o = (v ?? {}) as { name?: unknown; effect?: unknown };
  return { name: text(o.name, LIMITS.ruleName, old.name), effect: text(o.effect, LIMITS.rule, old.effect) };
};

/** Only the words and numbers on the card can change; the picture and its notes stay. */
export function applyEdit(kind: Kind, old: AnyCard, input: Partial<AnyCard> & Record<string, unknown>): AnyCard {
  const base = {
    ...old,
    name: text(input.name, LIMITS.name, old.name),
    description: text(input.description, LIMITS.description, old.description),
  };
  if (kind === "creature") {
    const o = old as CreatureCard;
    const abilities = Array.isArray(input.abilities) ? input.abilities : o.abilities;
    return {
      ...base,
      difficulty: num(input.difficulty, 1, 30, o.difficulty),
      successes: num(input.successes, 1, 7, o.successes),
      abilities: o.abilities.map((a, i) => named(abilities[i], a)),
      special: named(input.special, o.special),
    } as AnyCard;
  }
  if (kind === "equipment") {
    const o = old as EquipmentCard;
    return {
      ...base,
      cost: num(input.cost, 1, 50, o.cost),
      type: input.type === "consumable" || input.type === "permanent" ? input.type : o.type,
      effect: text(input.effect, LIMITS.rule, o.effect),
      uses_turn: typeof input.uses_turn === "boolean" ? input.uses_turn : o.uses_turn,
    } as AnyCard;
  }
  const o = old as PetCard;
  return {
    ...base,
    cost: num(input.cost, 1, 50, o.cost),
    bonuses: text(input.bonuses, LIMITS.bonuses, o.bonuses),
    power: named(input.power, o.power),
  } as AnyCard;
}

/** All the words on a card, for the safety checks. */
export function allText(card: AnyCard): string {
  const c = card as Partial<CreatureCard & EquipmentCard & PetCard>;
  return [
    c.name,
    c.description,
    c.effect,
    c.bonuses,
    c.power?.name,
    c.power?.effect,
    c.special?.name,
    c.special?.effect,
    ...(c.abilities ?? []).flatMap((a) => [a.name, a.effect]),
  ]
    .filter(Boolean)
    .join("\n");
}
