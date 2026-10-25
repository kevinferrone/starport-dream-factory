import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Kind } from "@/lib/options";
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
  roleplay: string;
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
        roleplay: { type: "string", description: "One line telling the Guide how to act as this pet" },
        image_prompt: { type: "string" },
      },
      required: ["name", "description", "cost", "bonuses", "power", "roleplay", "image_prompt"],
    },
  },
};

const RULES: Record<Kind, string> = {
  creature: CREATURE_RULES,
  equipment: EQUIPMENT_RULES,
  pet: PET_RULES,
};

function describeRequest(
  kind: Kind,
  labels: Record<string, string[]>,
  difficulty: number | undefined,
  text: string | undefined
) {
  const lines = Object.entries(labels)
    .filter(([, v]) => v.length)
    .map(([k, v]) => `- ${k}: ${v.join(", ")}`);
  if (kind === "creature") lines.push(`- Difficulty: ${difficulty} (use exactly this number)`);
  if (text?.trim()) lines.push(`- The kid's own idea (follow it if it fits Starport's rules): "${text.trim()}"`);
  return `A kid pressed these buttons in the Starport Dream Factory:\n${lines.join("\n")}\n\nBuild one ${kind} that clearly reflects every button they picked. Make it unique, interesting and funny.`;
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

async function askClaude(kind: Kind, userText: string): Promise<AnyCard> {
  const tool = TOOLS[kind];
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userText }];
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await anthropic().messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 1500,
      system: CORE_RULES + "\n" + RULES[kind],
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
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
    }
  }
  throw new Error("The Dream Factory couldn't finish this one. Please try again.");
}

/** Writes new stats from the buttons. */
export async function writeCard(
  kind: Kind,
  labels: Record<string, string[]>,
  difficulty?: number,
  text?: string
): Promise<AnyCard> {
  return askClaude(kind, describeRequest(kind, labels, difficulty, text));
}

/** "Shake up the stats": same name, look and picture; new rules. */
export async function rerollCard(
  kind: Kind,
  labels: Record<string, string[]>,
  old: AnyCard,
  difficulty?: number,
  text?: string
): Promise<AnyCard> {
  const prompt =
    describeRequest(kind, labels, difficulty, text) +
    `\n\nThis is a re-roll. Keep exactly this name, description and image_prompt:\nname: ${old.name}\ndescription: ${old.description}\nimage_prompt: ${old.image_prompt}\n\nThe previous stats were:\n${JSON.stringify(old)}\n\nInvent DIFFERENT abilities, effects and numbers that still fit the buttons and the balance guide.`;
  const card = await askClaude(kind, prompt);
  return { ...card, name: old.name, description: old.description, image_prompt: old.image_prompt };
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

/** Draws the picture and stores it. Returns its public URL and storage path. */
export async function drawPicture(userId: string, card: AnyCard) {
  const res = await openai().images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
    prompt: `${IMAGE_STYLE}\n\nSubject: ${card.image_prompt}`,
    size: "1024x1024",
    quality: (process.env.OPENAI_IMAGE_QUALITY as "low" | "medium" | "high") || "medium",
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
