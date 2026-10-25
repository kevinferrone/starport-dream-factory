// Every button in the three builders. Each one has a picture (emoji) and a word.
// Add, remove or rename buttons here; the builders and the AI prompts read from this file.

export type Option = { id: string; label: string; icon: string };
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
    min: 1,
    max: 3,
    options: [
      o("Funny", "😂"), o("Grumpy", "😠"), o("Sneaky", "🥷"), o("Strong", "💪"), o("Smart", "🧠"),
      o("Wild", "🤪"), o("Shy", "😳"), o("Happy", "😊"), o("Nervous", "😰"), o("Sleepy", "😴"),
    ],
  },
  {
    id: "looks",
    title: "Looks",
    icon: "👀",
    min: 1,
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
    min: 1,
    max: 1,
    options: [
      o("Staff", "🦯"), o("Wand", "🪄"), o("Bag", "🎒"), o("Tool", "🔧"), o("Hammer", "🔨"),
      o("Bowl", "🥣"), o("Hat", "🎩"), o("Feather", "🪶"), o("Orb", "🔮"), o("Potion", "🧪"),
      o("Jacket", "🧥"), o("Cape", "🦸"), o("Crown", "👑"), o("Headband", "🎀"), o("Ring", "💍"),
      o("Necklace", "📿"), o("Belt", "🪢"), o("Armor", "🛡️"), o("Boots", "🥾"), o("Gloves", "🧤"),
      o("Goggles", "🥽"), o("Socks", "🧦"), o("Mask", "🎭"), o("Scarf", "🧣"), o("Umbrella", "☂️"),
      o("Cookie", "🍪"), o("Glitter", "✨"), o("Sticker", "🏷️"), o("Music box", "🎶"), o("Key", "🔑"),
    ],
  },
  {
    id: "power",
    title: "Powers",
    icon: "⚡",
    min: 1,
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
    min: 1,
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
    min: 1,
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
    min: 1,
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
    max: 3,
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

/** What a builder sends: choices are { groupId: [optionId, ...] } */
export type BuildInput = { kind: Kind; choices: Record<string, string[]>; difficulty?: number; text?: string };

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
