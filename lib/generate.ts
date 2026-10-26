import Anthropic from "@anthropic-ai/sdk";
import OpenAI, { toFile } from "openai";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Kind } from "@/lib/options";
import { readingGuide } from "@/lib/reading-level";
import {
  CORE_RULES,
  CREATURE_RULES,
  EQUIPMENT_RULES,
  PET_RULES,
  IMAGE_STYLE,
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
export type AnyCard = CreatureCard | EquipmentCard | PetCard;

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
        image_prompt: { type: "string", description: "What the creature looks like, for the illustrator. No names of real characters." },
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
        image_prompt: { type: "string" },
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
        image_prompt: { type: "string" },
      },
      required: ["name", "description", "cost", "bonuses", "power", "image_prompt"],
    },
  },
};

/** A kid's drawing, ready to show to Claude and the illustrator. */
export type Drawing = { data: Buffer; mediaType: "image/jpeg" | "image/png" | "image/webp" };

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
  hasDrawing = false
) {
  const lines = Object.entries(labels)
    .filter(([, v]) => v.length)
    .map(([k, v]) => `- ${k}: ${v.join(", ")}`);
  if (kind === "creature") lines.push(`- Difficulty: ${difficulty} (use exactly this number)`);
  if (text?.trim()) lines.push(`- The kid's own idea (follow it if it fits Starport's rules): "${text.trim()}"`);
  const drawing = hasDrawing
    ? `\n\nThe kid also DREW their ${kind} (the attached picture). The drawing is the MAIN reference and wins over any button that disagrees with it: base the name, description and image_prompt on what they drew (its shape, colors, features and any details), and let the buttons add personality and powers. In image_prompt, describe the drawing faithfully and specifically (body shape, colors, number of eyes, limbs and other features) so the illustrator can recreate it. If part of the drawing is hard to read, make a kind, playful guess.`
    : "";
  return `A kid made these choices in the Starport Dream Factory:\n${lines.join("\n") || "- (no buttons picked)"}${drawing}\n\nBuild one ${kind} that clearly reflects everything they picked. Anything they didn't pick, invent yourself. Make it unique, interesting and funny.`;
}

/** Returns a problem description, or null if the card follows the rules. */
function checkCard(kind: Kind, card: AnyCard, difficulty?: number): string | null {
  if (!card.name || !card.description) return "Missing name or description.";
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
      system:
        CORE_RULES +
        "\n" +
        RULES[kind] +
        "\n\n" +
        readingGuide(readingLevel) +
        `\n\nALWAYS deliver your answer by calling the ${tool.name} tool exactly once. Never answer in plain text.`,
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
      `Review ONLY the rules text (${RULE_FIELDS[kind]}). For each one, ask: could a parent who has never played run this at the table instantly, without asking what anything means? Does it follow the RULES TEXT rules (direct game terms only, no invented number systems or jargon, no flavor inside the rule${kind === "equipment" ? ", no mention of whether it uses a turn" : ""})?\n` +
      (kind === "creature" ? `Difficulty: ${(card as CreatureCard).difficulty} (keep it).\n` : "") +
      `Rewrite any rule that fails into one or two short, direct sentences with the same strength. Leave rules that already pass exactly as they are. Keep every other field identical. Call the ${TOOLS[kind].name} tool with the full card.`;
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
  drawing?: Drawing
): Promise<AnyCard> {
  const card = await askClaude(kind, describeRequest(kind, labels, difficulty, text, !!drawing), readingLevel, drawing);
  return reviewRules(kind, card, readingLevel);
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
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
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

/** "Shake up the stats": same name, look and picture; new rules. */
export async function rerollCard(
  kind: Kind,
  labels: Record<string, string[]>,
  old: AnyCard,
  difficulty?: number,
  text?: string,
  readingLevel?: number | null
): Promise<AnyCard> {
  const prompt =
    describeRequest(kind, labels, difficulty, text) +
    `\n\nThis is a re-roll. Keep exactly this name, description and image_prompt:\nname: ${old.name}\ndescription: ${old.description}\nimage_prompt: ${old.image_prompt}\n\nThe previous stats were:\n${JSON.stringify(old)}\n\nInvent DIFFERENT abilities, effects and numbers that still fit the buttons and the balance guide.`;
  const card = await askClaude(kind, prompt, readingLevel);
  const fresh = { ...card, name: old.name, description: old.description, image_prompt: old.image_prompt };
  return reviewRules(kind, fresh, readingLevel);
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

/** Draws the picture (from the kid's drawing when there is one) and stores it. */
export async function drawPicture(userId: string, card: AnyCard, drawing?: Drawing) {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
  const quality = (process.env.OPENAI_IMAGE_QUALITY as "low" | "medium" | "high") || "medium";
  const res = drawing
    ? await openai().images.edit({
        model,
        image: await toFile(drawing.data, `drawing.${drawing.mediaType.split("/")[1]}`, { type: drawing.mediaType }),
        prompt:
          `${IMAGE_STYLE}\n\nThis is a child's own drawing. Bring it to life as a finished illustration in the style above, ` +
          `keeping THEIR design: the same body shape, colors, number of eyes and limbs, features, and pose, as close to the drawing as possible. ` +
          `Clean it up and make it look amazing, but don't add or remove main features. Do not include paper, pencils, hands or the background of the photo.\n\nSubject: ${card.image_prompt}`,
        size: "1024x1024",
        quality,
        n: 1,
      })
    : await openai().images.generate({
        model,
        prompt: `${IMAGE_STYLE}\n\nSubject: ${card.image_prompt}`,
        size: "1024x1024",
        quality,
        n: 1,
      });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("No picture came back. Please try again.");

  const path = `${userId}/${randomUUID()}.png`;
  const db = createAdminClient();
  const { error } = await db.storage
    .from("card-images")
    .upload(path, Buffer.from(b64, "base64"), { contentType: "image/png" });
  if (error) throw new Error("Couldn't save the picture.");
  const { data } = db.storage.from("card-images").getPublicUrl(path);
  return { url: data.publicUrl, path };
}
