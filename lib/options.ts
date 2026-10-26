// Every button in the three builders. Each one has a picture (emoji) and a word.
// Add, remove or rename buttons here; the builders and the AI prompts read from this file.

export type Option = {
  id: string;
  label: string;
  icon: string;
  once?: boolean; // equipment items: true = use once, false = keep forever
  boosts?: string[]; // equipment items: pattern ids this item type makes more likely
};
export type OptionGroup = {
  id: string;
  title: string;
  icon: string;
  max: number; // how many a kid can pick
  min: number;
  sections?: { title: string; options: Option[] }[];
  options?: Option[];
};
export type Kind = "creature" | "equipment" | "pet";

const o = (label: string, icon: string): Option => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  label,
  icon,
});

/**
 * An equipment item button. Every item type MUST say whether it's use-once and which
 * patterns it makes more likely (pattern ids from lib/patterns.ts), so new items are
 * always sorted into the pattern categories.
 */
const item = (label: string, icon: string, kind: "keep" | "once", boosts: string[]): Option => ({
  ...o(label, icon),
  once: kind === "once",
  boosts,
});

export const KINDS: Record<Kind, { title: string; icon: string; button: string; color: string }> = {
  creature: { title: "Creatures", icon: "🐲", button: "Build my creature", color: "#ff7a59" },
  equipment: { title: "Equipment", icon: "🪄", button: "Build my equipment item", color: "#7b61ff" },
  pet: { title: "Pets", icon: "🐾", button: "Build my pet", color: "#20b486" },
};

export const CREATURE_GROUPS: OptionGroup[] = [
  {
    id: "personality",
    title: "Personality",
    icon: "😄",
    min: 0,
    max: 1,
    options: [
      o("Funny", "😂"), o("Grumpy", "😠"), o("Sneaky", "🥷"), o("Strong", "💪"), o("Smart", "🧠"),
      o("Wild", "🤪"), o("Shy", "😳"), o("Happy", "😊"), o("Nervous", "😰"), o("Sleepy", "😴"),
    ],
  },
  {
    id: "looks",
    title: "Looks",
    icon: "👀",
    min: 0,
    max: 3,
    options: [
      o("Furry", "🧸"), o("Slimy", "🐌"), o("Scaly", "🐍"), o("Metal", "🔩"), o("Feathers", "🪶"),
      o("Glitter", "✨"), o("Rock", "🪨"), o("Wings", "🪽"), o("Tentacles", "🐙"), o("Horns", "🦏"),
      o("Many eyes", "👀"), o("Wheels", "🛞"), o("Tails", "🐒"),
    ],
  },
];

export const EQUIPMENT_GROUPS: OptionGroup[] = [
  {
    id: "item",
    title: "Item",
    icon: "🎒",
    min: 0,
    max: 1,
    options: [
      // Keep forever
      item("Staff", "🦯", "keep", ["action-item", "two-at-once"]),
      item("Wand", "🪄", "keep", ["action-item", "star-roll"]),
      item("Bag", "🎒", "keep", ["pocket-refill", "token-swap"]),
      item("Tool", "🔧", "keep", ["second-chance", "token-swap"]),
      item("Hammer", "🔨", "keep", ["action-item", "two-at-once"]),
      item("Bowl", "🥣", "keep", ["pocket-refill", "token-saver"]),
      item("Hat", "🎩", "keep", ["more-tokens", "super-senses"]),
      item("Feather", "🪶", "keep", ["super-senses", "lucky-streak"]),
      item("Jacket", "🧥", "keep", ["shield", "token-saver"]),
      item("Cape", "🦸", "keep", ["shield", "go-first"]),
      item("Crown", "👑", "keep", ["more-tokens", "every-roll"]),
      item("Headband", "🎀", "keep", ["more-tokens", "better-rolls"]),
      item("Ring", "💍", "keep", ["better-rolls", "second-chance", "natural-luck"]),
      item("Necklace", "📿", "keep", ["shield", "help-friend", "natural-luck"]),
      item("Belt", "🪢", "keep", ["more-tokens", "double-tokens"]),
      item("Armor", "🛡️", "keep", ["shield", "token-saver"]),
      item("Boots", "🥾", "keep", ["better-rolls", "go-first"]),
      item("Gloves", "🧤", "keep", ["more-tokens", "help-friend"]),
      item("Goggles", "🥽", "keep", ["super-senses", "lucky-streak"]),
      item("Socks", "🧦", "keep", ["better-rolls", "go-first"]),
      item("Mask", "🎭", "keep", ["super-senses", "comeback"]),
      item("Scarf", "🧣", "keep", ["help-friend", "token-saver"]),
      item("Umbrella", "☂️", "keep", ["shield", "token-saver"]),
      item("Music box", "🎶", "keep", ["two-at-once", "lucky-streak"]),
      item("Key", "🔑", "keep", ["second-chance", "coins-to-tokens"]),
      // Use once
      item("Orb", "🔮", "once", ["refill", "block", "coin-toss", "double-up"]),
      item("Potion", "🧪", "once", ["refill", "quick-power"]),
      item("Cookie", "🍪", "once", ["refill", "big-boost"]),
      item("Glitter", "✨", "once", ["silly-fix", "soft-landing", "sure-thing"]),
      item("Sticker", "🏷️", "once", ["block", "silly-fix"]),
      item("Candy", "🍬", "once", ["big-boost", "refill"]),
      item("Cupcake", "🧁", "once", ["refill", "soft-landing"]),
      item("Juice box", "🧃", "once", ["refill", "wild-token"]),
      item("Balloon", "🎈", "once", ["quick-power", "soft-landing"]),
      item("Magic scroll", "📜", "once", ["block", "sleepy-time", "zoom-home"]),
      item("Seed", "🌰", "once", ["refill", "silly-fix"]),
      item("Lucky dice", "🎲", "once", ["coin-toss", "sure-thing", "double-up"]),
      item("Party popper", "🎉", "once", ["everybody-freeze", "big-boost"]),
      item("Candle", "🕯️", "once", ["block", "sleepy-time"]),
      item("Mystery egg", "🥚", "once", ["wild-token", "quick-power"]),
    ],
  },
  {
    id: "power",
    title: "Powers",
    icon: "⚡",
    min: 0,
    max: 3,
    sections: [
      {
        title: "Trait powers",
        options: [o("Smart", "🧠"), o("Sneaky", "🥷"), o("Strong", "💪"), o("Helpful", "🤝"), o("Lucky", "🍀"), o("Fast", "⚡")],
      },
      {
        title: "Nature",
        options: [o("Fire", "🔥"), o("Water", "💧"), o("Ice", "❄️"), o("Wind", "🌪️"), o("Plant", "🌱"), o("Rock", "🪨"), o("Thunder", "⛈️")],
      },
      {
        title: "Sky and magic",
        options: [o("Star", "⭐"), o("Moon", "🌙"), o("Sun", "☀️"), o("Rainbow", "🌈"), o("Sparkle", "✨"), o("Fortune", "🔮"), o("Portal", "🌀")],
      },
      {
        title: "Sweet and silly",
        options: [o("Cotton Candy", "🍭"), o("Bubble", "🫧"), o("Cookie", "🍪"), o("Giggle", "😂"), o("Sneeze", "🤧"), o("Socks", "🧦"), o("Stinky", "💨")],
      },
      {
        title: "Feelings",
        options: [o("Sleepy", "😴"), o("Happy", "😊"), o("Grumpy", "😠"), o("Friendship", "💖"), o("Brave", "🦁")],
      },
      {
        title: "Weird",
        options: [o("Ghost", "👻"), o("Robot", "🤖"), o("Dragon", "🐉"), o("Music", "🎵"), o("Time", "⏰"), o("Mirror", "🪞"), o("Sticky", "🧲")],
      },
    ],
  },
];

export const PET_GROUPS: OptionGroup[] = [
  {
    id: "type",
    title: "Pet type",
    icon: "🐾",
    min: 0,
    max: 1,
    options: [
      o("Cat", "🐱"), o("Dog", "🐶"), o("Mouse", "🐭"), o("Fox", "🦊"), o("Bunny", "🐰"),
      o("Frog", "🐸"), o("Owl", "🦉"), o("Turtle", "🐢"), o("Lizard", "🦎"), o("Dragon", "🐉"),
      o("Unicorn", "🦄"), o("Octopus", "🐙"), o("Bee", "🐝"), o("Butterfly", "🦋"), o("Snail", "🐌"),
      o("Squirrel", "🐿️"), o("Monkey", "🐵"), o("Dinosaur", "🦖"), o("Robot", "🤖"), o("Alien", "👾"),
    ],
  },
  {
    id: "size",
    title: "Size",
    icon: "📏",
    min: 0,
    max: 1,
    options: [
      { id: "tiny", label: "Tiny (fits in a pocket)", icon: "🐜" },
      { id: "small", label: "Small (sits on a shoulder)", icon: "🐈" },
      { id: "medium", label: "Medium (walks beside you)", icon: "🐕" },
      { id: "big", label: "Big (you can ride it)", icon: "🐎" },
    ],
  },
  {
    id: "power",
    title: "Powers",
    icon: "✨",
    min: 0,
    max: 3,
    options: [
      o("Smart", "🧠"), o("Sneaky", "🥷"), o("Strong", "💪"), o("Helpful", "🤝"), o("Lucky", "🍀"),
      o("Flying", "🪽"), o("Finder", "🔍"), o("Protector", "🛡️"), o("Talker", "🗣️"), o("Future-seer", "🔮"),
      o("Magic", "✨"), o("Teleport", "🌀"), o("Invisible", "👻"), o("Treasure sniffer", "💰"),
    ],
  },
  {
    id: "personality",
    title: "Personality",
    icon: "😊",
    min: 0,
    max: 1,
    options: [
      o("Happy", "😊"), o("Sleepy", "😴"), o("Grumpy", "😠"), o("Shy", "😳"), o("Silly", "🤪"),
      o("Bossy", "🙄"), o("Know-it-all", "🤓"), o("Scaredy", "😱"), o("Cuddly", "🤗"), o("Always hungry", "😋"),
    ],
  },
  {
    id: "looks",
    title: "Looks",
    icon: "🎨",
    min: 0,
    max: 3,
    sections: [
      {
        title: "Color",
        options: [o("Red", "🔴"), o("Orange", "🟠"), o("Yellow", "🟡"), o("Green", "🟢"), o("Blue", "🔵"), o("Purple", "🟣"), o("Rainbow", "🌈")],
      },
      {
        title: "Body",
        options: [o("Fur", "🧸"), o("Scales", "🐍"), o("Feathers", "🪶"), o("Slime", "🐌"), o("Metal", "🔩"), o("Glitter", "✨"), o("Clouds", "☁️")],
      },
      {
        title: "Extras",
        options: [o("Wings", "🪽"), o("Horn", "🦄"), o("Many eyes", "👀"), o("Extra legs", "🐾"), o("Glows", "🌟"), o("Wears a hat", "🎩")],
      },
    ],
  },
];

export const GROUPS: Record<Kind, OptionGroup[]> = {
  creature: CREATURE_GROUPS,
  equipment: EQUIPMENT_GROUPS,
  pet: PET_GROUPS,
};

/** Creature difficulty is a slider from 5 to 20, with a face that matches. */
export const DIFFICULTY_MIN = 5;
export const DIFFICULTY_MAX = 20;
export function difficultyFace(d: number) {
  if (d <= 8) return { icon: "😊", label: "Easy" };
  if (d <= 12) return { icon: "🙂", label: "Medium" };
  if (d <= 16) return { icon: "😬", label: "Hard" };
  return { icon: "😱", label: "Super hard" };
}

export function allOptions(group: OptionGroup): Option[] {
  return group.options ?? group.sections?.flatMap((s) => s.options) ?? [];
}

/** Trims saved choices to today's button limits (e.g. older cards made before a limit changed). */
export function fitChoices(kind: Kind, choices: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const g of GROUPS[kind]) out[g.id] = (choices[g.id] ?? []).slice(0, g.max);
  return out;
}

/** What a builder sends: choices are { groupId: [optionId, ...] } */
export type BuildInput = {
  kind: Kind;
  choices: Record<string, string[]>;
  difficulty?: number;
  text?: string;
  drawing?: string; // a new drawing, as a JPEG data URL
  drawingPath?: string; // a drawing already uploaded (when changing buttons on an earlier card)
};

/** Fills any group the kid skipped with random picks, so pressing Build alone still makes something. */
export function fillRandom(kind: Kind, choices: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const g of GROUPS[kind]) {
    const picked = choices[g.id] ?? [];
    if (picked.length) {
      out[g.id] = picked;
      continue;
    }
    const pool = [...allOptions(g)];
    const count = g.max === 1 ? 1 : 1 + Math.floor(Math.random() * Math.min(2, g.max));
    const chosen: string[] = [];
    while (chosen.length < count && pool.length) {
      chosen.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
    }
    out[g.id] = chosen;
  }
  return out;
}

/** Checks a build request against the button rules and returns readable labels. */
export function validateChoices(input: BuildInput): { ok: true; labels: Record<string, string[]> } | { ok: false; error: string } {
  const groups = GROUPS[input.kind];
  if (!groups) return { ok: false, error: "Unknown kind" };
  const labels: Record<string, string[]> = {};
  for (const g of groups) {
    const picked = input.choices[g.id] ?? [];
    if (picked.length < g.min) return { ok: false, error: `Pick at least ${g.min} ${g.title}` };
    if (picked.length > g.max) return { ok: false, error: `Pick up to ${g.max} ${g.title}` };
    const opts = allOptions(g);
    const names: string[] = [];
    for (const id of picked) {
      const opt = opts.find((x) => x.id === id);
      if (!opt) return { ok: false, error: `Unknown choice ${id}` };
      names.push(opt.label);
    }
    labels[g.title] = names;
  }
  if (input.kind === "creature") {
    const d = Number(input.difficulty);
    if (!Number.isInteger(d) || d < DIFFICULTY_MIN || d > DIFFICULTY_MAX) {
      return { ok: false, error: "Difficulty must be 5 to 20" };
    }
  }
  if (input.text && input.text.length > 300) return { ok: false, error: "Description is too long" };
  return { ok: true, labels };
}

/** The picked equipment item type, if any (with its use-once flag and pattern boosts). */
export function pickedItem(choices: Record<string, string[]>): Option | null {
  const id = choices.item?.[0];
  if (!id) return null;
  const g = EQUIPMENT_GROUPS.find((x) => x.id === "item")!;
  return allOptions(g).find((x) => x.id === id) ?? null;
}
