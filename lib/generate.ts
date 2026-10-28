import Anthropic from "@anthropic-ai/sdk";
import OpenAI, { toFile } from "openai";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Kind } from "@/lib/options";
import { readingGuide } from "@/lib/reading-level";
import { WEAPONS } from "@/lib/safety";
import {
  CORE_RULES,
  CREATURE_RULES,
  EQUIPMENT_RULES,
  PET_RULES,
  IMAGE_STYLE,
  IMAGE_NEVER,
} from "@/lib/starport-rules";

// ---------- Card shapes ----------
export type CreatureCard = {
  name: string;
  description: string;
  difficulty: number;
  successes: number;
  abilities: { name: string; effect: string }[];
  special: { name: string; effect: string };
  image_prompt: string;
};
export type EquipmentCard = {
  name: string;
  description: string;
  cost: number;
  type: "permanent" | "consumable";
  effect: string;
  uses_turn: boolean;
  image_prompt: string;
};
export type PetCard = {
  name: string;
  description: string;
  cost: number;
  bonuses: string;
  power: { name: string; effect: string };
  roleplay?: string; // older cards only; no longer shown or generated
  image_prompt: string;
};
export type AnyCard = (CreatureCard | EquipmentCard | PetCard) & {
  /** The main colors chosen for the picture, kept so the next cards can pick different ones. */
  palette?: string;
};

const named = {
  type: "object",
  properties: { name: { type: "string" }, effect: { type: "string" } },
  required: ["name", "effect"],
};

const TOOLS: Record<Kind, Anthropic.Tool> = {
  creature: {
    name: "make_creature",
    description: "Return the finished Starport creature card.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string", description: "1-2 sentences" },
        difficulty: { type: "integer" },
        successes: { type: "integer", description: "1-7, usually 2-4" },
        abilities: { type: "array", items: named, minItems: 2, maxItems: 2 },
        special: named,
        image_prompt: {
          type: "string",
          description:
            "For the illustrator, specific and vivid. Start with what it is (the kid's chosen animal, item or base), then its 2-3 main colors, body shape and size, exact counts of legs, eyes, wings or tentacles, and every look button the kid picked. Then its pose. Never generic, never a little alien unless the kid picked Alien. Never holding a weapon or anything sharp. No names of real characters.",
        },
      },
      required: ["name", "description", "difficulty", "successes", "abilities", "special", "image_prompt"],
    },
  },
  equipment: {
    name: "make_equipment",
    description: "Return the finished Starport equipment card.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string", description: "1-2 sentences" },
        cost: { type: "integer", description: "1-50 Coins" },
        type: { type: "string", enum: ["permanent", "consumable"] },
        effect: { type: "string", description: "The rules text, 1-3 sentences" },
        uses_turn: { type: "boolean", description: "Does using it take the Player's turn?" },
        image_prompt: {
          type: "string",
          description:
            "For the illustrator, specific and vivid. Start with what it is (the kid's chosen animal, item or base), then its 2-3 main colors, body shape and size, exact counts of legs, eyes, wings or tentacles, and every look button the kid picked. Then its pose. Never generic, never a little alien unless the kid picked Alien. Never holding a weapon or anything sharp. No names of real characters.",
        },
      },
      required: ["name", "description", "cost", "type", "effect", "uses_turn", "image_prompt"],
    },
  },
  pet: {
    name: "make_pet",
    description: "Return the finished Starport pet card.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string", description: "1-2 sentences" },
        cost: { type: "integer", description: "1-50 Coins" },
        bonuses: { type: "string", description: "e.g. +2 to your maximum Smart tokens" },
        power: named,
        image_prompt: {
          type: "string",
          description:
            "For the illustrator, specific and vivid. Start with what it is (the kid's chosen animal, item or base), then its 2-3 main colors, body shape and size, exact counts of legs, eyes, wings or tentacles, and every look button the kid picked. Then its pose. Never generic, never a little alien unless the kid picked Alien. Never holding a weapon or anything sharp. No names of real characters.",
        },
      },
      required: ["name", "description", "cost", "bonuses", "power", "image_prompt"],
    },
  },
};

/** A kid's drawing, ready to show to Claude and the illustrator. */
export type Drawing = { data: Buffer; mediaType: "image/jpeg" | "image/png" | "image/webp" };

// ---------- Variety: random inspiration so pictures never fall back to one "default" look ----------
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

const BASES: Record<Kind, string[]> = {
  creature: [
    "an axolotl", "a teapot", "a cactus", "a jellyfish", "a moth", "an armadillo", "a storm cloud", "a mushroom",
    "a snail", "an owl", "a toaster", "a hedgehog", "a pumpkin", "a hermit crab", "a paper lantern", "a platypus",
    "a beetle", "a sloth", "a kite", "a seahorse", "a walrus", "a pinecone", "a chameleon", "a goat", "a rubber duck",
    "a bat", "a pangolin", "a starfish", "a narwhal", "a llama", "a frog", "a rock with legs", "a candle", "a dandelion",
  ],
  equipment: [],
  pet: [],
};
const PALETTES = [
  "tangerine and teal", "lemon yellow and plum", "mint and coral", "sky blue and sunflower", "lavender and lime",
  "cherry red and cream", "peacock blue and gold", "bubblegum pink and navy", "moss green and peach", "rust and turquoise",
  "periwinkle and orange", "charcoal and hot pink", "seafoam and magenta", "butterscotch and violet",
  "fire-engine red and sky blue", "copper and mint", "cobalt and lemon", "watermelon pink and green-apple",
  "sunset orange and deep blue", "honey gold and berry red", "silver and candy red", "chocolate brown and pink",
  "ocean blue and tangerine", "cream and cherry", "jade and coral", "black and electric yellow",
];
/** Colors are judged by their main color words, so "lavender and lime" counts as purple + green. */
const HUE: [RegExp, string][] = [
  [/red|cherry|watermelon|berry|rust/i, "red"], [/orange|tangerine|copper|butterscotch/i, "orange"],
  [/yellow|lemon|sunflower|gold|honey/i, "yellow"], [/green|lime|mint|moss|jade|seafoam|apple/i, "green"],
  [/blue|teal|turquoise|cobalt|navy|periwinkle|aqua/i, "blue"], [/purple|plum|lavender|violet|magenta/i, "purple"],
  [/pink|coral|bubblegum/i, "pink"], [/brown|chocolate/i, "brown"], [/black|charcoal|silver|cream/i, "neutral"],
];
const hues = (s: string) => new Set(HUE.filter(([re]) => re.test(s)).map(([, h]) => h));

/** A palette that shares no main color with the last few cards made on the site. */
function freshPalette(recentPalettes: string[]) {
  const used = new Set<string>();
  recentPalettes.slice(0, 2).forEach((p) => hues(p).forEach((h) => used.add(h)));
  const fresh = PALETTES.filter((p) => ![...hues(p)].some((h) => used.has(h) && h !== "neutral"));
  const notSame = PALETTES.filter((p) => !recentPalettes.slice(0, 8).includes(p));
  return pick(fresh.length ? fresh : notSame.length ? notSame : PALETTES);
}

const POSES = [
  "mid-jump", "waving hello", "tiptoeing", "doing a silly dance", "peeking out shyly", "striking a proud pose",
  "spinning in a circle", "sitting and grinning", "stretching a big yawn", "leaning in curiously",
];
const BACKDROPS = ["pale mint", "soft peach", "light lavender", "butter yellow", "baby blue", "blush pink", "pale aqua"];

/** The kid picked a color button. */
const colorPicked = (labels: Record<string, string[]>) =>
  (labels["Looks"] ?? []).some((l) => /red|orange|yellow|green|blue|purple|rainbow/i.test(l));

function inspiration(kind: Kind, labels: Record<string, string[]>, hasDrawing: boolean, palette?: string) {
  if (hasDrawing) return "";
  const has = (title: string) => (labels[title]?.length ?? 0) > 0;
  const lines: string[] = [];
  if (kind === "creature" && !has("Looks")) lines.push(`- Start from ${pick(BASES.creature)} and make it weird and wonderful`);
  if (kind !== "equipment") lines.push(`- Pose: ${pick(POSES)}`);
  const parts = lines.length
    ? `\n\nINSPIRATION for anything the kid didn't pick (their buttons always win over these):\n${lines.join("\n")}`
    : "";
  return palette
    ? parts +
        `\n\nCOLORS (required): the ${kind === "equipment" ? "item" : "character"} itself is mainly ${palette}. ` +
        `Use exactly these as its main colors in image_prompt, even for magic or nature powers (show those with sparkles, glow or shapes, not by switching colors). Don't default to purple and green.`
    : parts;
}

async function recentPalettes(): Promise<string[]> {
  try {
    const { data } = await createAdminClient()
      .from("creations")
      .select("card")
      .order("created_at", { ascending: false })
      .limit(8);
    return (data ?? []).map((r) => String((r.card as { palette?: string })?.palette ?? "")).filter(Boolean);
  } catch {
    return [];
  }
}

/** Short look notes from the latest cards on the site, so new ones look different. */
async function recentLooks(): Promise<string[]> {
  try {
    const { data } = await createAdminClient()
      .from("creations")
      .select("card")
      .order("created_at", { ascending: false })
      .limit(15);
    return (data ?? [])
      .map((r) => String((r.card as { image_prompt?: string })?.image_prompt ?? "").slice(0, 140))
      .filter(Boolean);
  } catch {
    return [];
  }
}

const RULES: Record<Kind, string> = {
  creature: CREATURE_RULES,
  equipment: EQUIPMENT_RULES,
  pet: PET_RULES,
};

function describeRequest(
  kind: Kind,
  labels: Record<string, string[]>,
  difficulty: number | undefined,
  text: string | undefined,
  hasDrawing = false,
  plan?: string
) {
  const lines = Object.entries(labels)
    .filter(([, v]) => v.length)
    .map(([k, v]) => `- ${k}: ${v.join(", ")}`);
  if (kind === "creature") lines.push(`- Difficulty: ${difficulty} (use exactly this number)`);
  if (text?.trim()) lines.push(`- The kid's own idea (follow it if it fits Starport's rules): "${text.trim()}"`);
  const drawing = hasDrawing
    ? `\n\nThe kid also DREW their ${kind} (the attached picture). The drawing is the MAIN reference and wins over any button that disagrees with it: base the name, description and image_prompt on what they drew (its shape, colors, features and any details), and let the buttons add personality and powers. In image_prompt, describe the drawing faithfully and specifically (body shape, colors, number of eyes, limbs and other features) so the illustrator can recreate it. If part of the drawing is hard to read, make a kind, playful guess.`
    : "";
  const patterns = plan
    ? `\n\nUSE EXACTLY THESE RULE PATTERNS (they were chosen for this card). Keep each pattern's structure, fill in the [brackets] and N to fit this ${kind} and the balance guide, and give each one its own fun name and wording that matches the ${kind}'s look and personality. Never use the pattern names themselves on the card:\n${plan}`
    : "";
  return `A kid made these choices in the Starport Dream Factory:\n${lines.join("\n") || "- (no buttons picked)"}${drawing}${patterns}\n\nBuild one ${kind} that clearly reflects everything they picked. Anything they didn't pick, invent yourself. Make it unique, interesting and funny.`;
}

/** Returns a problem description, or null if the card follows the rules. */

function checkCard(kind: Kind, card: AnyCard, difficulty?: number): string | null {
  if (!card.name || !card.description) return "Missing name or description.";
  if (WEAPONS.test(JSON.stringify(card)))
    return "No weapons or sharp things anywhere on the card (guns, lasers, blasters, swords, knives, spears, arrows, axes). Replace them with something harmless and silly.";
  if (kind === "creature") {
    const c = card as CreatureCard;
    if (c.difficulty !== difficulty) return `Difficulty must be exactly ${difficulty}.`;
    if (!Number.isInteger(c.successes) || c.successes < 1 || c.successes > 7) return "Successes Needed must be 1 to 7.";
    if (!Array.isArray(c.abilities) || c.abilities.length !== 2) return "Exactly 2 abilities are required.";
    if (!c.special?.effect) return "A Special is required.";
  } else {
    const e = card as EquipmentCard | PetCard;
    if (!Number.isInteger(e.cost) || e.cost < 1 || e.cost > 50) return "Cost must be 1 to 50 Coins.";
  }
  return null;
}

const anthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const imageBlock = (d: Drawing): Anthropic.ImageBlockParam => ({
  type: "image",
  source: { type: "base64", media_type: d.mediaType, data: d.data.toString("base64") },
});

async function askClaude(kind: Kind, userText: string, readingLevel?: number | null, drawing?: Drawing): Promise<AnyCard> {
  const tool = TOOLS[kind];
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: drawing ? [imageBlock(drawing), { type: "text", text: userText }] : userText },
  ];
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await anthropic().messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 1500,
      // The rulebook part never changes, so it's cached: repeat sends cost a fraction.
      system: [
        { type: "text", text: CORE_RULES + "\n" + RULES[kind], cache_control: { type: "ephemeral" } },
        {
          type: "text",
          text:
            readingGuide(readingLevel) +
            `\n\nALWAYS deliver your answer by calling the ${tool.name} tool exactly once. Never answer in plain text.`,
        },
      ],
      tools: [tool],
      tool_choice: { type: "auto" },
      messages,
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (block && block.type === "tool_use") {
      const card = block.input as AnyCard;
      const difficulty = /Difficulty: (\d+)/.exec(userText)?.[1];
      const problem = checkCard(kind, card, difficulty ? Number(difficulty) : undefined);
      if (!problem) return card;
      messages.push({ role: "assistant", content: res.content });
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: block.id,
            is_error: true,
            content: `That breaks a rule: ${problem} Fix it and call ${tool.name} again.`,
          },
        ],
      });
    } else {
      // Answered without the tool: nudge it and try again.
      messages.push({ role: "assistant", content: res.content });
      messages.push({ role: "user", content: `Please call the ${tool.name} tool now with the finished card.` });
    }
  }
  throw new Error("The Dream Factory couldn't finish this one. Please try again.");
}

const RULE_FIELDS: Record<Kind, string> = {
  creature: "abilities[].effect and special.effect",
  equipment: "effect",
  pet: "bonuses and power.effect",
};

/**
 * Second look: reads the rules text like a parent at the table and rewrites anything
 * unclear. Keeps the name, description, numbers, price and picture exactly the same.
 */
async function reviewRules(kind: Kind, card: AnyCard, readingLevel?: number | null): Promise<AnyCard> {
  try {
    const prompt =
      `Here is a finished Starport ${kind} card:\n${JSON.stringify(card, null, 2)}\n\n` +
      `Review ONLY the rules text (${RULE_FIELDS[kind]}). For each one, ask: could a parent who has never played run this at the table instantly, without asking what anything means? Does it follow the RULES TEXT rules (direct game terms only, no invented number systems or jargon, no flavor inside the rule${kind === "equipment" ? ", no mention of whether it uses a turn" : ""})? Does it break any of the RULES THAT CAN NEVER BE BROKEN, or repeat anything on the NEVER DO THIS list? Then do the TABLE TEST on each rule: play out one round with it and say what actually changes. If nothing changes, or Players and creatures are affected exactly the same, rewrite it so it has a real, one-sided effect.\n` +
      (kind === "creature" ? `Difficulty: ${(card as CreatureCard).difficulty} (keep it).\n` : "") +
      `Rewrite any rule that fails into one or two short, direct sentences with the same strength and the same structure (who it affects, what roll, what happens). Leave rules that already pass exactly as they are. Keep every other field identical. Call the ${TOOLS[kind].name} tool with the full card.`;
    const reviewed = (await askClaude(kind, prompt, readingLevel)) as AnyCard;
    // Never let the review change anything but rules text.
    const keep = { name: card.name, description: card.description, image_prompt: card.image_prompt };
    if (kind === "creature") {
      const c = card as CreatureCard;
      return { ...reviewed, ...keep, difficulty: c.difficulty, successes: c.successes } as CreatureCard;
    }
    if (kind === "equipment") {
      const e = card as EquipmentCard;
      return { ...reviewed, ...keep, cost: e.cost, type: e.type, uses_turn: e.uses_turn } as EquipmentCard;
    }
    const p = card as PetCard;
    return { ...reviewed, ...keep, cost: p.cost } as PetCard;
  } catch {
    return card; // if the review fails, the original card is still fine to show
  }
}

/** Writes new stats from the buttons. */
export async function writeCard(
  kind: Kind,
  labels: Record<string, string[]>,
  difficulty?: number,
  text?: string,
  readingLevel?: number | null,
  drawing?: Drawing,
  plan?: string
): Promise<AnyCard> {
  const [recent, palettes] = await Promise.all([recentLooks(), recentPalettes()]);
  const palette = !drawing && !colorPicked(labels) ? freshPalette(palettes) : undefined;
  const variety =
    inspiration(kind, labels, !!drawing, palette) +
    `\n\nVARIETY: Never fall back on a generic look like a little green alien or a plain round blob${
      labels["Pet type"]?.includes("Alien") ? " (an alien is fine here, but make it an unusual one)" : ""
    }.` +
    (recent.length && !drawing
      ? ` Make this clearly different (body shape, colors and kind of being) from these recent cards:\n${recent.map((r) => `- ${r}`).join("\n")}`
      : "");
  const card = await askClaude(
    kind,
    describeRequest(kind, labels, difficulty, text, !!drawing, plan) + variety,
    readingLevel,
    drawing
  );
  const reviewed: AnyCard = await reviewRules(kind, card, readingLevel);
  if (palette) reviewed.palette = palette;
  return reviewed;
}

/**
 * Makes sure an upload is a drawing, toy or object — not a photo of a real person —
 * and is fine for kids. Returns null if OK, or a friendly reason if not.
 */
export async function checkDrawing(d: Drawing, dataUrl: string): Promise<string | null> {
  const tool: Anthropic.Tool = {
    name: "drawing_check",
    description: "Report whether this upload can be used.",
    input_schema: {
      type: "object",
      properties: {
        ok: { type: "boolean" },
        reason: { type: "string", description: "If not ok, one short kid-friendly sentence." },
      },
      required: ["ok"],
    },
  };
  try {
    const [moderation, res] = await Promise.all([
      openai().moderations.create({
        model: "omni-moderation-latest",
        input: [{ type: "image_url", image_url: { url: dataUrl } }],
      }),
      anthropic().messages.create({
        model: process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-5-5", // simple yes/no check: the small model is plenty
        max_tokens: 200,
        tools: [tool],
        tool_choice: { type: "auto" },
        messages: [
          {
            role: "user",
            content: [
              imageBlock(d),
              {
                type: "text",
                text: "A child uploaded this to turn into a character, item or pet for a kids' game. Call drawing_check. ok = true if it is a drawing, painting, sketch, craft, toy or object (a hand holding the paper is fine). ok = false if it is a photograph where a real person's face is clearly visible, or if it is not suitable for young children.",
              },
            ],
          },
        ],
      }),
    ]);
    if (moderation.results.some((r) => r.flagged)) return "Let's try a different picture.";
    const block = res.content.find((b) => b.type === "tool_use");
    const out = block && block.type === "tool_use" ? (block.input as { ok: boolean; reason?: string }) : null;
    if (out && !out.ok) return "Please use a drawing, not a photo of a person.";
    return null;
  } catch {
    return null; // don't block kids if a check service hiccups
  }
}

/** "Change the stats": same name, look and picture; new rules. */
export async function rerollCard(
  kind: Kind,
  labels: Record<string, string[]>,
  old: AnyCard,
  difficulty?: number,
  text?: string,
  readingLevel?: number | null,
  plan?: string
): Promise<AnyCard> {
  const prompt =
    describeRequest(kind, labels, difficulty, text, false, plan) +
    `\n\nThis is a re-roll. Keep exactly this name, description and image_prompt:\nname: ${old.name}\ndescription: ${old.description}\nimage_prompt: ${old.image_prompt}\n\nThe previous stats were:\n${JSON.stringify(old)}\n\nWrite NEW rules from the patterns above, with different names and numbers that still fit the buttons and the balance guide.`;
  const card = await askClaude(kind, prompt, readingLevel);
  const fresh = { ...card, name: old.name, description: old.description, image_prompt: old.image_prompt };
  return reviewRules(kind, fresh, readingLevel);
}

/**
 * After the picture is drawn, Claude looks at it and rewrites the description (and the
 * picture notes) to match what was actually drawn. The picture is what kids see.
 */
export async function matchToPicture(kind: Kind, card: AnyCard, imageUrl: string, readingLevel?: number | null): Promise<AnyCard> {
  const tool: Anthropic.Tool = {
    name: "match_picture",
    description: "Return the description and image notes rewritten to match the picture.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string", description: "1-2 sentences, same personality and humor, matching the picture" },
        image_prompt: { type: "string", description: "What the picture actually shows" },
      },
      required: ["description", "image_prompt"],
    },
  };
  try {
    const res = await anthropic().messages.create({
      model: process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-5-5", // describing a picture: the small model is plenty
      max_tokens: 600,
      system: readingGuide(readingLevel),
      tools: [tool],
      tool_choice: { type: "auto" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            {
              type: "text",
              text:
                `This picture was drawn for a Starport ${kind} card named "${card.name}".\n` +
                `Card description: "${card.description}"\n\n` +
                `Compare the description with the picture. If any look detail disagrees (colors, number of eyes, legs, wings or tentacles, fur vs scales, size, what kind of thing it is), rewrite the description to match the PICTURE exactly, keeping the same personality, humor and length. If it already matches, return it unchanged. Also describe what the picture actually shows in image_prompt. Call match_picture.`,
            },
          ],
        },
      ],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (block && block.type === "tool_use") {
      const out = block.input as { description?: string; image_prompt?: string };
      if (out.description?.trim()) {
        return { ...card, description: out.description.trim(), image_prompt: out.image_prompt?.trim() || card.image_prompt };
      }
    }
  } catch (e) {
    console.error("matchToPicture", e);
  }
  return card; // if the check fails, keep the original words
}

/** Screens the kid's free-text box. Returns true if it's OK. */
export async function textIsSafe(text: string | undefined): Promise<boolean> {
  if (!text?.trim()) return true;
  try {
    const res = await openai().moderations.create({ model: "omni-moderation-latest", input: text });
    return !res.results.some((r) => r.flagged);
  } catch {
    return true; // don't block kids if the screening service hiccups
  }
}

/** The look buttons the kid pressed, which the picture has to show. */
export function mustShow(labels: Record<string, string[]>): string {
  const explain: Record<string, string> = {
    "Extra legs": "extra legs (more than 4 legs, matching the count in the subject)",
    "Many eyes": "many eyes (3 to 6, matching the count in the subject)",
  };
  const parts = ["Pet type", "Item", "Size", "Looks"].flatMap((g) => labels[g] ?? []);
  return parts.map((p) => explain[p] ?? p.toLowerCase()).join("; ");
}

/** Looks at a finished picture: does it show what the kid picked, and is it free of weapons? */
async function checkPicture(
  b64: string,
  card: AnyCard,
  musts: string
): Promise<string | null> {
  const tool: Anthropic.Tool = {
    name: "picture_check",
    description: "Report whether the picture can be used.",
    input_schema: {
      type: "object",
      properties: {
        ok: { type: "boolean" },
        problems: { type: "string", description: "If not ok: what is wrong, as short instructions for the illustrator." },
      },
      required: ["ok"],
    },
  };
  try {
    const res = await anthropic().messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 300,
      tools: [tool],
      tool_choice: { type: "auto" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/png", data: b64 } },
            {
              type: "text",
              text:
                `This picture is for a kids' game card. It was supposed to show: ${card.image_prompt}\n` +
                (musts ? `The child picked these, and each one MUST be clearly visible: ${musts}.\n` : "") +
                `ok = false if ANY of these are true:\n` +
                `- It shows a different kind of thing than asked (for example a little alien or a person instead of a frog).\n` +
                (musts ? `- Any of the child's picks is missing or wrong (kind of animal or item, color, fur/scales/feathers, extra legs, many eyes, wings, size).\n` : "") +
                `- Anything that looks like a weapon or sharp object: gun, laser, blaster, ray gun, sword, knife, spear, arrow, axe.\n` +
                `- A space suit or helmet that wasn't asked for.\n` +
                `Otherwise ok = true. Small style differences are fine. Call picture_check.`,
            },
          ],
        },
      ],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (block && block.type === "tool_use") {
      const out = block.input as { ok?: boolean; problems?: string };
      if (out.ok === false) return out.problems?.trim() || "The picture didn't match the card.";
    }
  } catch (e) {
    console.error("checkPicture", e);
  }
  return null;
}

/**
 * Draws the picture (from the kid's drawing when there is one), checks it shows
 * what the kid picked with no weapons, redraws up to twice if not, and stores it.
 */
export async function drawPicture(userId: string, card: AnyCard, drawing?: Drawing, musts = "") {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
  const quality = (process.env.OPENAI_IMAGE_QUALITY as "low" | "medium" | "high") || "medium";
  const backdrop = pick(BACKDROPS);

  const draw = async (fix: string) => {
    const fixNote = fix ? `\n\nIMPORTANT, the last try was wrong. Fix this: ${fix}` : "";
    const res = drawing
      ? await openai().images.edit({
          model,
          image: await toFile(drawing.data, `drawing.${drawing.mediaType.split("/")[1]}`, { type: drawing.mediaType }),
          prompt:
            `${IMAGE_STYLE}\n\nThis is a child's own drawing. Bring it to life as a finished illustration in the style above, ` +
            `keeping THEIR design: the same body shape, colors, number of eyes and limbs, features, and pose, as close to the drawing as possible. ` +
            `Clean it up and make it look amazing, but don't add or remove main features. Do not include paper, pencils, hands or the background of the photo.\n\n` +
            `Subject: ${card.image_prompt}\n\n${IMAGE_NEVER}${fixNote}`,
          size: "1024x1024",
          quality,
          n: 1,
        })
      : await openai().images.generate({
          model,
          // What it is comes first: picture models pay the most attention to the start.
          prompt:
            (musts ? `MUST SHOW: ${musts}.\n\n` : "") +
            `Subject: ${card.image_prompt}` +
            (card.palette ? `\nMain colors of the subject: ${card.palette}.` : "") +
            `\n\nStyle: ${IMAGE_STYLE} Background color: ${backdrop}.\n\n${IMAGE_NEVER}${fixNote}`,
          size: "1024x1024",
          quality,
          n: 1,
        });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new Error("No picture came back. Please try again.");
    return b64;
  };

  let b64 = await draw("");
  let pictures = 1;
  for (let tries = 0; tries < 2; tries++) {
    const problem = await checkPicture(b64, card, drawing ? "" : musts);
    if (!problem) break;
    console.log("picture redraw:", problem);
    b64 = await draw(problem);
    pictures++;
  }

  const path = `${userId}/${randomUUID()}.png`;
  const db = createAdminClient();
  const { error } = await db.storage
    .from("card-images")
    .upload(path, Buffer.from(b64, "base64"), { contentType: "image/png" });
  if (error) throw new Error("Couldn't save the picture.");
  const { data } = db.storage.from("card-images").getPublicUrl(path);
  return { url: data.publicUrl, path, pictures, quality };
}
