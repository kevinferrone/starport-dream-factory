// Characters: picture-only hero cards. No stats.
// This file turns the kid's buttons and the saved cards they brought into a clear
// "what they wear, hold and carry" list for Claude and the illustrator.
import { CHARACTER_GROUPS, EQUIPMENT_GROUPS, ITEM_SLOT, allOptions, type Option, type Slot } from "@/lib/options";

/** A saved equipment or pet card the kid brought along. */
export type Brought = {
  id: string;
  kind: "equipment" | "pet";
  name: string;
  /** What the card's picture actually shows (the card's image notes). */
  look: string;
  /** Equipment: the item type button it was made with (hat, boots…), if any. Pets: size. */
  itemType?: string | null;
  size?: string | null;
};

const CAPACITY: Partial<Record<Slot, number>> = { held: 2, ring: 99 };

const SLOT_WORDS: Record<Slot, string> = {
  head: "on their head",
  eyes: "over their eyes",
  mask: "on their face",
  neck: "around their neck",
  back: "on their back",
  outer: "worn over their clothes",
  outfit: "as their outfit",
  feet: "on their feet",
  hands: "on their hands",
  waist: "around their waist",
  held: "in their hand",
  ring: "on a finger",
};

const PET_PLACE: Record<string, string> = {
  tiny: "peeking out of a pocket or sitting on their shoulder",
  small: "sitting on their shoulder or in their arms",
  medium: "standing right beside them",
  big: "standing beside them, big enough to ride",
};

/** The picked options for one character group, in the order they appear on screen. */
function picked(groupId: string, choices: Record<string, string[]>): Option[] {
  const g = CHARACTER_GROUPS.find((x) => x.id === groupId);
  if (!g) return [];
  const opts = allOptions(g);
  return (choices[groupId] ?? []).map((id) => opts.find((o) => o.id === id)).filter((o): o is Option => !!o);
}

const say = (o: Option) => o.prompt ?? o.label.toLowerCase();

/** The item type label of an equipment card ("Hat", "Boots"…), from its saved choices. */
export function itemTypeLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  const g = EQUIPMENT_GROUPS.find((x) => x.id === "item");
  return g ? allOptions(g).find((o) => o.id === id)?.label ?? null : null;
}

/**
 * Who wears or holds what. Items from saved cards come first (in the order the kid picked
 * them), then buttons. Each body slot takes one thing (hands take two); anything that
 * doesn't fit is carried: in a bag, hanging from a belt, or tucked under an arm.
 */
export function loadout(choices: Record<string, string[]>, brought: Brought[]) {
  type Thing = { what: string; slot: Slot; fromCard?: string };
  const things: Thing[] = [];
  for (const b of brought) {
    if (b.kind !== "equipment") continue;
    const slot: Slot = (b.itemType && ITEM_SLOT[b.itemType]) || "held";
    things.push({ what: `"${b.name}" (${b.look})`, slot, fromCard: b.name });
  }
  for (const gid of ["outfit", "extra", "face", "holding"]) {
    for (const o of picked(gid, choices)) if (o.slot) things.push({ what: say(o), slot: o.slot });
  }
  const used: Partial<Record<Slot, number>> = {};
  const worn: string[] = [];
  const carried: string[] = [];
  for (const t of things) {
    const n = used[t.slot] ?? 0;
    if (n < (CAPACITY[t.slot] ?? 1)) {
      used[t.slot] = n + 1;
      worn.push(`${t.what}, ${SLOT_WORDS[t.slot]}`);
    } else {
      carried.push(t.what);
    }
  }
  const pets = brought
    .filter((b) => b.kind === "pet")
    .map((p) => `their pet "${p.name}" (${p.look}), ${PET_PLACE[p.size ?? ""] ?? "right beside them"}`);
  return { worn, carried, pets };
}

/** Everything the kid picked that isn't an item, as plain lines for Claude. */
function looks(choices: Record<string, string[]>) {
  const line = (title: string, gid: string, keepSlotted = false) => {
    const list = picked(gid, choices).filter((o) => keepSlotted || !o.slot);
    return list.length ? `- ${title}: ${list.map(say).join(", ")}` : null;
  };
  const whoOpt = picked("who", choices)[0];
  return [
    whoOpt ? `- Who they are: ${say(whoOpt)} — always a KID version: young, kid-sized, big head, big friendly eyes` : null,
    line("Job", "job", true),
    line("Skin, fur, scale or metal color", "skin", true),
    line("Hair", "hair", true),
    line("Face", "face"),
    line("Something extra", "extra"),
    line("Pose", "pose", true),
    line("Mood", "mood", true),
    line("Location (the background)", "location", true),
  ].filter(Boolean) as string[];
}

/** The request Claude gets for a character. */
export function describeCharacter(
  choices: Record<string, string[]>,
  brought: Brought[],
  opts: { text?: string; heroName?: string; hasDrawing: boolean; hasRefs: boolean }
) {
  const { worn, carried, pets } = loadout(choices, brought);
  const lines = looks(choices);
  if (worn.length) lines.push(`- Wearing and holding (each exactly where it says):\n${worn.map((w) => `    • ${w}`).join("\n")}`);
  if (carried.length)
    lines.push(
      `- Also carrying (extras that didn't fit, so they are in a bag, hanging from a belt, or tucked under an arm, NOT worn):\n${carried
        .map((w) => `    • ${w}`)
        .join("\n")}`
    );
  if (pets.length) lines.push(`- With them:\n${pets.map((w) => `    • ${w}`).join("\n")}`);
  if (opts.text?.trim()) lines.push(`- The kid's own idea (follow it if it's kind and fits): "${opts.text.trim()}"`);
  const name = opts.heroName?.trim()
    ? `\n\nThe kid named their hero "${opts.heroName.trim()}". Use exactly that name.`
    : "";
  const drawing = opts.hasDrawing
    ? `\n\nThe kid also DREW their hero (the first attached picture). The drawing is the main reference: describe it faithfully in image_prompt, and let the buttons add details.`
    : "";
  const refs = opts.hasRefs
    ? `\n\nThe other attached pictures are the kid's own saved cards (their pets and items). In image_prompt, describe each one so it looks just like its card.`
    : "";
  return (
    `A kid is making a picture of their own Starport hero in the Dream Factory. Their choices:\n${lines.join("\n") || "- (no buttons picked)"}` +
    name +
    drawing +
    refs +
    `\n\nInvent anything they didn't pick, so the hero feels unique and fun. Items from the kid's saved cards are the most important things in the picture: never drop or swap them.`
  );
}

/** How Claude should write a character card (picture only, no game rules). */
export const CHARACTER_GUIDE = `You make hero cards for the Starport Dream Factory, where kids design their own hero for Starport, a kind, non-violent tabletop roleplaying game for kids ages 4-12.

A hero card has NO stats and NO rules. It has:
- name: a fun, easy-to-say hero name (2-3 words at most). If the kid gave a name, use it exactly.
- description: 1-2 short sentences (25 words or fewer) in a warm, playful voice that say who this hero is and what they love doing. Mention their job if they picked one.
- image_prompt: for the illustrator, specific and vivid, 120 words or fewer. Start with what the hero is (always a KID version: young, kid-sized, big friendly eyes), then skin, fur or metal color, hair, face, outfit, what they wear on their head and feet, anything extra, what is in their hands, what they carry, any pets with them, the pose, the mood, and the background. Name exact colors. Keep every item exactly where the choices put it (worn, held or carried).

Never include weapons or sharp things (no swords, guns, lasers, blasters, knives, spears, arrows or axes), anything scary, or real people or famous characters.`;

/** The picture style for characters: a full-body storybook hero, with a real place behind them if one was picked. */
export function characterStyle(choices: Record<string, string[]>) {
  const loc = picked("location", choices)[0];
  const plain = !loc || loc.id === "plain-background";
  return (
    "Whimsical children's storybook illustration for a kids' game hero card. Bright saturated colors, soft clean outlines, friendly expressive face, cute and funny, never scary. " +
    "One kid-aged hero (child proportions: big head, big eyes, small body), full body visible and centered, with any pets beside them, drawn a little small so nothing touches or is cut off by the edges. " +
    (plain
      ? "Simple soft pastel background with a few sparkles."
      : `Background: ${say(loc)}, painted softly and simply so the hero stands out.`) +
    " No text, no letters, no words, no frame."
  );
}

/** What the picture check insists on: the kind of hero, as a kid, and every pet and card item. */
export function characterMusts(choices: Record<string, string[]>, brought: Brought[]) {
  const whoOpt = picked("who", choices)[0];
  const parts = [whoOpt ? `${say(whoOpt)}, drawn as a young kid (kid-sized, not an adult)` : "a kid-aged hero (young, not an adult)"];
  for (const b of brought) parts.push(b.kind === "pet" ? `their pet "${b.name}" (${b.look})` : `the item "${b.name}" (${b.look}), worn, held or carried`);
  return parts.join("; ");
}
