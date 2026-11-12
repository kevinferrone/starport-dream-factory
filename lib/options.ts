// Every button in the three builders. Each one has a picture (emoji) and a word.
// Add, remove or rename buttons here; the builders and the AI prompts read from this file.

export type Option = {
  id: string;
  label: string;
  icon: string;
  once?: boolean; // equipment items: true = use once, false = keep forever
  boosts?: string[]; // equipment items: pattern ids this item type makes more likely
  /** Characters: what the illustrator is told (when it needs more than the label). */
  prompt?: string;
  /** Characters: a color circle instead of an emoji (skin and hair colors). */
  swatch?: string;
  /** Characters: where it goes on the body. Two things in one slot: the first is worn, the rest are carried. */
  slot?: Slot;
  /** Characters: has a painted picture icon (made in Admin), with the emoji as a fallback. */
  pic?: boolean;
};
/** Body slots for characters. "held" fits 2 (one per hand); "ring" fits any number; the rest fit 1. */
export type Slot = "head" | "eyes" | "mask" | "neck" | "back" | "outer" | "outfit" | "feet" | "hands" | "waist" | "held" | "ring";
export type OptionGroup = {
  id: string;
  title: string;
  icon: string;
  max: number; // how many a kid can pick
  min: number;
  sections?: { title: string; options: Option[] }[];
  options?: Option[];
  /** Only one pick per section (e.g. one hair style and one hair color). */
  onePerSection?: boolean;
  /** Shown under the title instead of the usual "Pick 1" hint. */
  hint?: string;
};
export type Kind = "character" | "creature" | "equipment" | "pet";

const o = (label: string, icon: string, prompt?: string): Option => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  label,
  icon,
  ...(prompt ? { prompt } : {}),
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
  character: { title: "Characters", icon: "🧒", button: "Build my character", color: "#ff6fb5" },
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

// ---------- Characters: picture only, no stats ----------
/** A "Who are you?" button: always drawn as a KID version, with a painted icon. */
const who = (label: string, icon: string, prompt?: string): Option => ({
  ...o(label, icon),
  pic: true,
  prompt: prompt ?? `a little ${label.toLowerCase()} kid`,
});
const sw = (label: string, swatch: string, prompt?: string): Option => ({ ...o(label, "●"), swatch, prompt });
const at = (slot: Slot) => (label: string, icon: string, prompt?: string): Option => ({ ...o(label, icon), slot, prompt });
const head = at("head"), feet = at("feet"), outfit = at("outfit"), held = at("held"), eyes = at("eyes");

export const CHARACTER_GROUPS: OptionGroup[] = [
  {
    id: "who",
    title: "Who are you?",
    icon: "🧒",
    min: 0,
    max: 1,
    options: [
      who("Kid", "🧒", "a human kid"), who("Robot", "🤖", "a little robot kid"), who("Alien", "👽", "a friendly little alien kid"),
      who("Elf", "🧝", "a young elf kid with pointy ears"), who("Dwarf", "🧔", "a young dwarf kid, short and sturdy, no beard yet"),
      who("Fairy", "🧚", "a fairy kid with little wings"), who("Mermaid", "🧜", "a merkid with a fish tail"),
      who("Gekkoid", "🦎", "a young Gekkoid: a friendly gecko kid who walks on two legs"),
      who(
        "Dactyloid",
        "🪽",
        "a young Dactyloid: a baby pterodactyl kid with a long pointed beak, a bony crest on the back of its head and big leathery wings (no feathers)"
      ),
      who("Fox", "🦊"), who("Bunny", "🐰"), who("Bear", "🐻"), who("Cat", "🐱"), who("Dog", "🐶"), who("Frog", "🐸"),
      who("Owl", "🦉"), who("Penguin", "🐧"), who("Panda", "🐼"), who("Raccoon", "🦝"), who("Mouse", "🐭"),
      who("Tiger", "🐯"), who("Lion", "🦁"), who("Monkey", "🐵"), who("Otter", "🦦"), who("Koala", "🐨"),
      who("Hedgehog", "🦔"), who("Turtle", "🐢"), who("Octopus", "🐙"), who("Bee", "🐝"), who("Dragon", "🐲"),
      who("Dinosaur", "🦖"), who("Unicorn", "🦄"), who("Yeti", "❄️", "a fluffy little yeti kid"),
      who("Plant", "🌱", "a sprout kid made of leaves and vines"), who("Mushroom", "🍄", "a mushroom kid with a mushroom-cap head"),
      who("Cloud", "☁️", "a fluffy cloud kid"), who("Star", "⭐", "a glowing little star kid"),
      who("Slime", "🫧", "a squishy, see-through slime kid"), who("Ghost", "👻", "a cute, friendly little ghost kid"),
      who("Snowman", "⛄", "a little snow kid"), who("Candy", "🍭", "a kid made of candy"),
    ],
  },
  {
    id: "job",
    title: "What is your job?",
    icon: "🧰",
    min: 0,
    max: 1,
    options: [
      o("Explorer", "🧭"), o("Inventor", "⚙️"), o("Chef", "🧑‍🍳"), o("Mail carrier", "📮"), o("Musician", "🎸"),
      o("Pet tamer", "🐾"), o("Wizard", "🧙"), o("Gardener", "🌻"), o("Detective", "🔍"), o("Joke-teller", "🤡"),
      o("Pilot", "✈️"), o("Artist", "🎨"), o("Scientist", "🧪"), o("Builder", "🏗️"), o("Doctor", "🩺"),
      o("Astronaut", "🚀"), o("Dancer", "💃"), o("Storyteller", "📖"), o("Treasure hunter", "💎"), o("Baker", "🧁"),
      o("Sailor", "⛵"), o("Firefighter", "🚒"), o("Librarian", "📚"), o("Magician", "🎩"), o("Park ranger", "🌲"),
      o("Map maker", "🗺️"), o("Toy maker", "🧸"), o("Sports star", "🏆"), o("Dragon trainer", "🐉"), o("Star gazer", "🔭"),
    ],
  },
  {
    id: "skin",
    title: "Skin color",
    icon: "🎨",
    min: 0,
    max: 1,
    hint: "Pick 1 (for animals and robots it's their fur, scales or metal), or skip it for a surprise",
    sections: [
      {
        title: "Skin",
        options: [
          sw("Fair", "#fde3cf", "fair skin"), sw("Light", "#f6cfae", "light skin"), sw("Medium", "#e0a879", "medium skin"),
          sw("Tan", "#c68a5a", "tan skin"), sw("Brown", "#8d5a3b", "brown skin"), sw("Deep brown", "#5a3522", "deep brown skin"),
        ],
      },
      {
        title: "Fantasy colors",
        options: [
          sw("Blue", "#5aa9ff"), sw("Green", "#4fcf7a"), sw("Purple", "#a77bff"), sw("Pink", "#ff8cc6"),
          sw("Orange", "#ff9a3d"), sw("Gold", "#f2c230"), sw("Silver", "#c9cfd8"), sw("Rainbow", "conic-gradient(red, orange, yellow, lime, deepskyblue, violet, red)", "rainbow"),
        ],
      },
    ],
  },
  {
    id: "hair",
    title: "Hair",
    icon: "💇",
    min: 0,
    max: 2,
    onePerSection: true,
    hint: "Pick a style and a color, or skip it for a surprise",
    sections: [
      {
        title: "Style",
        options: [
          o("Short", "💇"), o("Long", "👱"), o("Curly", "🌀"), o("Spiky", "⚡"), o("Braids", "🪢"), o("Ponytail", "🎀"),
          o("Pigtails", "👧"), o("Space buns", "🪐"), o("Afro puffs", "☁️"), o("Mohawk", "🦔"), o("Messy", "🌪️"),
          o("Bald", "🥚"), o("Flower hair", "🌸"), o("Leaf hair", "🍃"), o("Glowing hair", "✨"), o("Cloud hair", "🌥️"),
        ],
      },
      {
        title: "Color",
        options: [
          sw("Black", "#1f1b24", "black hair"), sw("Brown", "#6b4226", "brown hair"), sw("Red", "#c4471f", "red hair"),
          sw("Blonde", "#f1cf6b", "blonde hair"), sw("White", "#f4f4f4", "white hair"), sw("Blue", "#3f8cff", "blue hair"),
          sw("Pink", "#ff7fbf", "pink hair"), sw("Green", "#3cc46a", "green hair"), sw("Purple", "#9b63ff", "purple hair"),
          sw("Rainbow", "conic-gradient(red, orange, yellow, lime, deepskyblue, violet, red)", "rainbow hair"),
        ],
      },
    ],
  },
  {
    id: "face",
    title: "Face",
    icon: "😊",
    min: 0,
    max: 3,
    options: [
      o("Freckles", "🟤"), eyes("Glasses", "👓"), eyes("Sunglasses", "🕶️"), eyes("Monocle", "🧐"), o("Big smile", "😁"),
      o("Gap tooth", "😬"), o("Braces", "🦷"), o("Rosy cheeks", "☺️"), o("Dimples", "😊"), o("Face paint", "🎨"),
      o("Star stickers", "⭐"), o("Silly mustache", "🥸"), o("Whiskers", "🐱"), o("Big eyes", "👀"),
      o("Three eyes", "🔮", "three eyes"), o("Glowing eyes", "🌟"), o("Sleepy eyes", "😴"), o("Bandana", "🧣", "a bandana tied on the forehead"),
    ],
  },
  {
    id: "outfit",
    title: "Outfit",
    icon: "👕",
    min: 0,
    max: 3,
    onePerSection: true,
    hint: "Pick clothes, something on your head and something on your feet, or skip it for a surprise",
    sections: [
      {
        title: "Clothes",
        options: [
          outfit("Explorer vest", "🦺", "an explorer vest with lots of pockets"), outfit("Space jumpsuit", "🧑‍🚀"),
          outfit("Cozy sweater", "🧶"), outfit("Overalls", "👖"), outfit("Hoodie", "🧥"), outfit("Robe of stars", "🌌"),
          outfit("Pajamas", "🛌"), outfit("Chef apron", "🧑‍🍳"), outfit("Lab coat", "🥼"), outfit("Raincoat", "🌧️"),
          outfit("Superhero suit", "🦸"), outfit("Sports jersey", "🎽"), outfit("Fancy suit", "🤵"), outfit("Fancy dress", "👗"),
          outfit("Tutu", "🩰"), outfit("Mail carrier uniform", "📮"), outfit("Pirate coat", "🏴‍☠️", "a big swishy pirate coat (no weapons)"),
          outfit("Knight armor", "🛡️", "shiny storybook knight armor (no weapons)"),
        ],
      },
      {
        title: "On your head",
        options: [
          head("Wizard hat", "🧙"), head("Crown", "👑"), head("Baseball cap", "🧢"),
          head("Flower crown", "🌼"), head("Pilot goggles", "🥽", "pilot cap and goggles"), head("Top hat", "🎩"),
          head("Chef hat", "👨‍🍳"), head("Helmet", "⛑️", "an adventure helmet"), head("Bow", "🎀", "a big hair bow"),
          head("Headphones", "🎧"), head("Party hat", "🥳"),
        ],
      },
      {
        title: "On your feet",
        options: [
          feet("Sneakers", "👟"), feet("Rain boots", "🥾"), feet("Light-up shoes", "✨"), feet("Roller skates", "🛼"),
feet("Sandals", "🩴"), feet("Cowboy boots", "🤠"), feet("Barefoot", "🦶"),
          feet("Jet boots", "🚀", "jet boots with little puffs of cloud"),
        ],
      },
    ],
  },
  {
    id: "extra",
    title: "Something extra",
    icon: "✨",
    min: 0,
    max: 2,
    options: [
      o("Wings", "🪽"), o("Tail", "🐒"), o("Robot arm", "🦾"), at("back")("Cape", "🦸"), at("back")("Jetpack", "🚀"),
      at("back")("Backpack", "🎒"), o("Sparkle trail", "✨"), o("Bubble shield", "🫧", "a shimmering bubble around them"),
      o("Little horns", "🦄"), o("Antennae", "🐜"), o("Pointy ears", "🧝"), o("Halo of stars", "💫"),
      at("neck")("Medal", "🏅"), at("neck")("Scarf", "🧣"), at("waist")("Tool belt", "🧰"), o("Glowing aura", "🌟"),
      o("Floating books", "📚"), o("Musical notes", "🎶", "musical notes floating around them"),
    ],
  },
  {
    id: "holding",
    title: "Holding",
    icon: "🤲",
    min: 0,
    max: 2,
    options: [
      held("Lantern", "🏮"), held("Treasure map", "🗺️"), held("Magic wand", "🪄"), held("Book", "📖"),
      held("Giant wrench", "🔧"), held("Big spoon", "🥄"), held("Kite", "🪁"), held("Balloon", "🎈"), held("Guitar", "🎸"),
      held("Paintbrush", "🖌️"), held("Telescope", "🔭"), held("Magnifying glass", "🔍"), held("Butterfly net", "🦋"),
      held("Teddy bear", "🧸"), held("Sandwich", "🥪"), held("Ice cream", "🍦"), held("Flower", "🌷"), held("Compass", "🧭"),
      held("Crystal", "💎"), held("Umbrella", "☂️"), held("Trophy", "🏆"), held("Skateboard", "🛹"), held("Letter", "✉️"),
      held("Potion", "🧪"),
    ],
  },
  {
    id: "pose",
    title: "Pose",
    icon: "🤸",
    min: 0,
    max: 1,
    options: [
      o("Waving", "👋"), o("Jumping", "🦘"), o("Running", "🏃"), o("Sneaking", "🐾", "tiptoeing and sneaking"),
      o("Flying", "🕊️"), o("Dancing", "💃"), o("Sitting", "🪑"), o("Superhero landing", "🦸"), o("Cartwheel", "🤸"),
      o("Pointing ahead", "👉"), o("Climbing", "🧗"), o("Reading", "📖"), o("Thumbs up", "👍"), o("Hands on hips", "🦸"),
      o("Peeking", "🫣", "peeking out from behind something"), o("Floating", "🎈"),
    ],
  },
  {
    id: "mood",
    title: "Mood",
    icon: "😄",
    min: 0,
    max: 1,
    options: [
      o("Happy", "😊"), o("Excited", "🤩"), o("Brave", "😤"), o("Silly", "🤪"), o("Curious", "🤔"), o("Calm", "😌"),
      o("Proud", "😎"), o("Sleepy", "😴"), o("Shy", "😳"), o("Grumpy", "😠"), o("Surprised", "😮"), o("Determined", "💪"),
      o("Mischievous", "😏"), o("Dreamy", "😇"),
    ],
  },
  {
    id: "location",
    title: "Location",
    icon: "🗺️",
    min: 0,
    max: 1,
    // Starport places use the 1e and 2e manuscript descriptions, so the background looks like the real place.
    sections: [
      {
        title: "Starport",
        options: [
          o("Town Hall", "🏛️", "Starport's Town Hall: a grand, cheerful hall with tall windows and banners, a big Quest Board covered in pinned notes, and a plate of cookies"),
          o("Bardo's shop", "🏪", "inside Bardo's Equipment Shop: much taller inside than outside, with spiraling shelves of magical gear (hats, wands, potions, backpacks) climbing up and up in warm lantern light"),
          o("Game Room", "🎲", "the Game Room: a bright, noisy room full of game tables, puzzles, riddle posters and a hoverboard race track"),
          o("Kids Club", "📚", "the Kids Club: a cozy library and craft room with tall bookshelves, bean bags, craft tables and puzzle tables"),
          o("Laboratory", "🧪", "the Laboratory: a bubbly lab with glowing potion bottles, bubbling green goo, twisty ribbons of smoke, rumbly pebbles and floaty bottles"),
          o("Newsroom", "📰", "the Newsroom: a busy mail-and-news room with letters flying through the air, tall sorting cubbies and stacks of envelopes"),
          o("Pet Shelter", "🐾", "the Pet Shelter: a cheerful home for pets with cozy pens, treat jars, flying cats and all kinds of odd, friendly critters"),
          o("Port of Stars", "🗼", "the Port of Stars: a busy sky port where airships and flying machines dock, with Tinkerton, a flying mechanical tower, floating above"),
          o("Starville", "🏘️", "Starville: an open-air market town with striped market stalls, apple pies and cozy little homes"),
          o("Fortuna's Flames", "🔮", "Fortuna's Flames: a fortune-teller's tent in Starville, glowing with candles, crystal balls and a silver mirror"),
          o("Simmering Kitchen", "🍲", "the Simmering Kitchen: a bustling gnome kitchen in Starville with bubbling pots, hanging pans and towers of ingredients"),
          o("Spell Tower", "🪄", "the Spell Tower: a wizard's tall, twisty tower in Starville with glowing floating letters and shelves of spell books"),
          o("Forest", "🌳", "the Forest: a magical forest of giant trees with secret hiding hollows and rainbow slides winding between the trunks"),
          o("River", "🏞️", "the River: a sparkling river with an old rope bridge, smooth stones and a friendly manta ray gliding in the water"),
          o("Mushrooga Village", "🍄", "Mushrooga Village: round mushroom houses on the riverbank past the old rope bridge, one with a living green door"),
          o("Mountains", "⛰️", "the Mountains: tall rocky peaks with climbing ropes, caves, a dwarf's little metal hut and a sleepy volcano far away"),
          o("Swamp", "🐸", "the Swamp: a misty, friendly swamp with glowing flowers, lily pads and mossy logs"),
        ],
      },
      {
        title: "Beyond Starport",
        options: [
          o("Robotopia", "🤖", "Robotopia: a bright robot city of gears, crystals and glowing signs"),
          o("Undercity", "💎", "the Undercity: glowing crystal caves, mushroom groves and stone bridges underground"),
          o("Multiversal Mailer", "✉️", "aboard the Multiversal Mailer: a giant flying mail ship full of letters"),
          o("Floating island", "🏝️"), o("Beach", "🏖️"), o("Snowy hill", "🏔️"), o("Underwater", "🐠"),
          o("Outer space", "🌌", "outer space with stars and planets"), o("Castle", "🏰"), o("Candy hills", "🍭"),
        ],
      },
      {
        title: "Plain",
        options: [o("Plain background", "✂️", "a plain soft pastel background (good for cutting out)")],
      },
    ],
  },
];

/**
 * Where each equipment item type goes on a character. Items from a kid's saved cards
 * use this; anything not listed (or a card with no item type) is held.
 */
export const ITEM_SLOT: Record<string, Slot> = {
  hat: "head", crown: "head", headband: "head", goggles: "eyes", mask: "mask", jacket: "outer", cape: "back",
  bag: "back", armor: "outer", boots: "feet", socks: "feet", gloves: "hands", ring: "ring", necklace: "neck",
  scarf: "neck", belt: "waist",
};

/** The most saved cards a kid can bring into a character picture. */
export const MAX_BRING = 3;

export const GROUPS: Record<Kind, OptionGroup[]> = {
  character: CHARACTER_GROUPS,
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

/** Equipment and pets: an optional Coin value from 1 to 50 that sets how strong it is. */
export const COINS_MIN = 1;
export const COINS_MAX = 50;
export function coinFace(c: number) {
  if (c <= 4) return { icon: "🪙", label: "A little" };
  if (c <= 14) return { icon: "💰", label: "Some" };
  if (c <= 24) return { icon: "💎", label: "A lot" };
  if (c <= 39) return { icon: "👑", label: "Super" };
  return { icon: "🌟", label: "Legendary" };
}

export function allOptions(group: OptionGroup): Option[] {
  return group.options ?? group.sections?.flatMap((s) => s.options) ?? [];
}

/** Trims saved choices to today's buttons and limits (e.g. older cards made before a button changed). */
export function fitChoices(kind: Kind, choices: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const g of GROUPS[kind]) {
    const ids = new Set(allOptions(g).map((x) => x.id));
    out[g.id] = (choices[g.id] ?? []).filter((id) => ids.has(id)).slice(0, g.max); // buttons that were renamed or removed drop out
  }
  return out;
}

/** What a builder sends: choices are { groupId: [optionId, ...] } */
export type BuildInput = {
  kind: Kind;
  choices: Record<string, string[]>;
  difficulty?: number;
  coins?: number; // equipment and pets; leave out to let the factory pick
  text?: string;
  drawing?: string; // a new drawing, as a JPEG data URL
  drawingPath?: string; // a drawing already uploaded (when changing buttons on an earlier card)
  bring?: string[]; // characters: saved equipment and pet card ids, in the order picked
  heroName?: string; // characters: a name the kid typed
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
    if (g.onePerSection && g.sections) {
      // One random pick from each section (a style and a color, etc.).
      out[g.id] = g.sections.map((sec) => sec.options[Math.floor(Math.random() * sec.options.length)].id);
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
    if (g.onePerSection && g.sections) {
      for (const sec of g.sections) {
        if (picked.filter((id) => sec.options.some((x) => x.id === id)).length > 1) {
          return { ok: false, error: `Pick just 1 ${sec.title.toLowerCase()} in ${g.title}` };
        }
      }
    }
    labels[g.title] = names;
  }
  if (input.kind === "creature") {
    const d = Number(input.difficulty);
    if (!Number.isInteger(d) || d < DIFFICULTY_MIN || d > DIFFICULTY_MAX) {
      return { ok: false, error: "Difficulty must be 5 to 20" };
    }
  }
  if (input.coins !== undefined && input.coins !== null) {
    const c = Number(input.coins);
    if (input.kind === "creature" || !Number.isInteger(c) || c < COINS_MIN || c > COINS_MAX) {
      return { ok: false, error: "Coin value must be 1 to 50" };
    }
  }
  if (input.text && input.text.length > 300) return { ok: false, error: "Description is too long" };
  if (input.kind === "character") {
    if ((input.bring ?? []).length > MAX_BRING) return { ok: false, error: `Bring up to ${MAX_BRING} cards` };
    if (input.heroName && input.heroName.length > 40) return { ok: false, error: "That name is too long" };
  } else if (input.bring?.length || input.heroName) {
    return { ok: false, error: "Only characters can bring cards" };
  }
  return { ok: true, labels };
}

/** The picked equipment item type, if any (with its use-once flag and pattern boosts). */
export function pickedItem(choices: Record<string, string[]>): Option | null {
  const id = choices.item?.[0];
  if (!id) return null;
  const g = EQUIPMENT_GROUPS.find((x) => x.id === "item")!;
  return allOptions(g).find((x) => x.id === id) ?? null;
}
