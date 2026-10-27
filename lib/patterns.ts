// The approved pattern banks. Every card draws its mechanics from here, so cards
// stay balanced and varied. Claude writes the names, wording and flavor.
//
// Odds: common 6, uncommon 3, rare 1 (pets: main group 3, rare 1).
// Each picked button that matches a pattern triples its chance.
import type { Kind } from "@/lib/options";

export type Tier = "common" | "uncommon" | "rare" | "main";
export type Pattern = {
  id: string;
  name: string;
  tier: Tier;
  rule: string; // the structure Claude must follow
  boosts: string[]; // button ids that make this pattern more likely
  minDifficulty?: number; // creatures only
  price?: string; // equipment and pets
};

const WEIGHT: Record<Tier, number> = { common: 6, uncommon: 3, rare: 1, main: 3 };

// ---------------------------------------------------------------- creatures
export const CREATURE_ABILITIES: Pattern[] = [
  { id: "direct-hit", name: "Direct hit", tier: "common", rule: "1 Player loses N tokens.", boosts: ["strong", "grumpy", "horns", "rock"] },
  { id: "group-hit", name: "Group hit", tier: "common", rule: "All Players lose N tokens (about half what a single-Player hit would cost).", boosts: ["strong", "wild", "wings", "rock"] },
  { id: "roll-or-tokens", name: "Roll or lose tokens", tier: "common", rule: "1 Player must succeed on a [trait] roll against the creature or lose N tokens.", boosts: ["slimy", "grumpy", "scaly"] },
  { id: "dodge", name: "Describe your dodge", tier: "common", rule: "1 Player must describe how they avoid it and make an appropriate action roll against the creature (the Guide picks the trait). On a failed roll, [a penalty: lose tokens, lose next turn, or lose an item].", boosts: ["tentacles", "tails", "wheels", "wild"] },
  { id: "roll-or-turn", name: "Roll or lose your turn", tier: "common", rule: "1 Player must succeed on a [trait] roll against the creature or lose their next turn.", boosts: ["sleepy", "smart", "nervous"] },
  { id: "hit-then-roll", name: "Hit, then roll", tier: "common", rule: "1 Player loses 1 token and must succeed on a [trait] roll against the creature or lose their next turn.", boosts: ["grumpy", "nervous", "horns"] },
  { id: "pay-to-shake", name: "Pay to shake it off", tier: "uncommon", rule: "1 Player loses 1 token and their next turn, unless they spend 2 [trait] tokens to shake it off.", boosts: ["metal", "slimy"] },
  { id: "stuck", name: "Stuck until you escape", tier: "uncommon", rule: "1 Player (or all Players) must succeed on a [trait] roll against the creature or get stuck. A stuck Player can only use their turn to try to escape with a Sneaky or Tough roll against the creature (their choice). They also get free if the creature is defeated.", boosts: ["slimy", "tentacles", "furry"] },
  { id: "follow-up", name: "Follow-up chain", tier: "uncommon", rule: "This ability only works on a Player already affected by the creature's other ability, and hits harder (for example, they lose 2 more tokens). Make the other ability the first step.", boosts: ["tentacles", "tails", "wild"] },
  { id: "grab-item", name: "Grab an item", tier: "uncommon", rule: "1 Player must succeed on a [trait] roll against the creature or lose (or break) 1 equipment item.", boosts: ["sneaky", "metal", "many-eyes"] },
  { id: "grab-coins", name: "Grab Coins", tier: "uncommon", rule: "1 Player must succeed on a [trait] roll against the creature or it grabs N Coins.", boosts: ["sneaky", "glitter"] },
  { id: "no-tokens", name: "No tokens allowed", tier: "uncommon", rule: "No Player can spend tokens (or one kind of token) until the creature's next turn.", boosts: ["smart", "slimy", "grumpy"] },
  { id: "silly-action", name: "Silly action", tier: "uncommon", rule: "1 Player loses 1 token and must do a silly action, chosen by the Guide, for the rest of the encounter.", boosts: ["funny", "wild", "happy"] },
  { id: "vanish", name: "Vanish", tier: "uncommon", rule: "The creature hides or turns invisible. Its Difficulty goes up by 4 until a Player uses their turn to find it with a Smart roll against its normal Difficulty (finding it doesn't count as a success).", boosts: ["shy", "sneaky", "feathers"] },
  { id: "share-pain", name: "Share the pain", tier: "uncommon", rule: "The Players lose N tokens in total (about 1 per Player plus 1) and choose together how to split them.", boosts: ["happy", "wild", "funny"] },
  { id: "transform", name: "Silly transformation", tier: "uncommon", rule: "1 Player must succeed on a [trait] roll against the creature or turn into something silly and can't act on their next turn. After that they snap back on their own, or sooner if a friend spends 2 Helpful tokens to free them.", boosts: ["glitter", "funny", "smart"] },
  { id: "pass-it-on", name: "Pass it on", tier: "rare", rule: "Starting with 1 Player, each Player in turn must succeed on a [trait] roll against the creature or lose 2 tokens and pass it to the next Player. It stops as soon as someone succeeds.", boosts: ["nervous", "happy", "many-eyes"] },
  { id: "do-over", name: "Do-over", tier: "rare", rule: "Once per round, right after a Player succeeds on a roll against it, the creature makes them roll again.", boosts: ["smart", "many-eyes"] },
  { id: "trait-wipe", name: "Trait wipe", tier: "rare", minDifficulty: 15, rule: "1 Player must succeed on a [trait] roll against the creature or lose ALL their remaining tokens of that trait.", boosts: ["smart", "metal"] },
  { id: "trait-shutoff", name: "Trait shut-off", tier: "rare", minDifficulty: 12, rule: "1 Player must succeed on a [trait] roll against the creature or they can't make [that trait] rolls for the rest of the encounter.", boosts: ["slimy", "sleepy"] },
];

export const CREATURE_SPECIALS: Pattern[] = [
  { id: "right-approach", name: "Right approach", tier: "common", rule: "Succeeding on a roll by [doing the one thing it loves] gains 2 successes instead of 1.", boosts: ["happy", "furry", "funny"] },
  { id: "on-success", name: "When you succeed, it reacts", tier: "common", rule: "Any time a Player succeeds on a roll against it, [something small happens to that Player: lose 1 token, or it takes 1 Coin].", boosts: ["sneaky", "grumpy", "metal"] },
  { id: "on-fail", name: "When you fail, it reacts", tier: "common", rule: "Any time a Player fails a roll against it, [something small and funny happens to that Player].", boosts: ["funny", "shy", "nervous"] },
  { id: "bribe", name: "Easy to bribe", tier: "common", rule: "If a Player gives it [one specific thing], it [skips its next turn, or counts as 1 success].", boosts: ["happy", "sleepy", "furry"] },
  { id: "one-way", name: "Only one way", tier: "uncommon", rule: "It can only be defeated by [one specific kind of action]. Successes from anything else don't count.", boosts: ["funny", "smart"] },
  { id: "no-trait-tokens", name: "No tokens of one trait", tier: "uncommon", rule: "[Trait] tokens can't be used on rolls against it.", boosts: ["grumpy", "smart", "rock"] },
  { id: "hard-to-help", name: "Hard to help", tier: "uncommon", rule: "Helpful tokens cost 2 for each +1 on rolls against it.", boosts: ["grumpy", "shy"] },
  { id: "pay-before", name: "Pay before you roll", tier: "uncommon", rule: "Before a Player makes a roll against it, they must [lose 1 token, or succeed on a quick roll] or lose that turn.", boosts: ["horns", "scaly", "glitter"] },
  { id: "ambush", name: "Ambush", tier: "uncommon", rule: "It takes its turn before the Players in the first round.", boosts: ["sneaky", "wheels", "wings"] },
  { id: "roll-twice", name: "Roll twice, take the lower", tier: "uncommon", rule: "Players roll twice on rolls against it and use the lower roll.", boosts: ["wild", "glitter", "many-eyes"] },
  { id: "grows", name: "Grows with the group", tier: "uncommon", rule: "Successes Needed goes up by 1 for each [Player / tentacle / tail / head], up to 7.", boosts: ["tentacles", "tails", "many-eyes"] },
  { id: "ouch-aura", name: "Ouch aura", tier: "uncommon", rule: "Any Player who uses an ability or equipment item on it loses 1 token.", boosts: ["scaly", "horns", "rock", "metal"] },
  { id: "adapts", name: "Adapts", tier: "rare", rule: "Once an action earns a success against it, that same kind of action can't earn a success again.", boosts: ["smart", "metal"] },
  { id: "trait-fails", name: "Trait doesn't work", tier: "rare", minDifficulty: 15, rule: "[Trait] rolls against it always fail.", boosts: ["strong", "rock", "metal"] },
  { id: "double-turn", name: "Double turn", tier: "rare", minDifficulty: 15, rule: "It uses 2 abilities on each of its turns.", boosts: ["wings", "wheels", "wild"] },
];

// ---------------------------------------------------------------- equipment
export const EQUIPMENT_KEEP: Pattern[] = [
  { id: "more-tokens", name: "More tokens", tier: "common", price: "10 Coins (+4 Helpful: 15)", rule: "You get +2 to your maximum [trait] tokens (or +4 maximum Helpful tokens).", boosts: ["smart", "sneaky", "strong", "helpful"] },
  { id: "better-rolls", name: "Better rolls", tier: "common", price: "15 Coins", rule: "You get +1 on every [trait] roll.", boosts: ["smart", "sneaky", "strong", "brave", "socks"] },
  { id: "action-item", name: "Action item", tier: "common", price: "20 Coins", rule: "When you succeed on a [trait] roll against a creature using this item, you gain the success as normal, and you may spend 1 [trait] token to either make the creature lose its next turn OR gain 1 extra success. Pick ONE of those two for this item.", boosts: ["ice", "thunder", "rock", "sleepy", "wind", "fire"] },
  { id: "second-chance", name: "Second chance", tier: "common", price: "10 Coins", rule: "Spend 3 tokens to re-roll any action roll.", boosts: ["lucky", "fortune", "time"] },
  { id: "token-saver", name: "Token saver", tier: "common", price: "10 Coins", rule: "Once per encounter, when you lose tokens, lose 1 fewer.", boosts: ["bubble", "cotton-candy", "brave", "plant"] },
  { id: "token-swap", name: "Token swap", tier: "common", price: "10 Coins", rule: "Once per encounter, you may spend one kind of token as if it were another kind.", boosts: ["rainbow", "mirror", "sparkle"] },
  { id: "natural-luck", name: "Natural luck", tier: "common", price: "10 Coins", rule: "Any time you roll a natural 20 or a natural 1 on an action roll, gain 1 [trait] token (up to your maximum).", boosts: ["lucky", "star", "fortune"] },
  { id: "go-first", name: "Go first", tier: "uncommon", price: "10 Coins", rule: "You always take the first turn in turn-based encounters.", boosts: ["fast", "wind", "thunder", "socks"] },
  { id: "help-friend", name: "Help a friend", tier: "uncommon", price: "10 Coins", rule: "When you succeed on a roll, you may spend 1 Helpful token to give a friend back 1 lost token.", boosts: ["helpful", "friendship", "happy"] },
  { id: "shield", name: "Shield", tier: "uncommon", price: "15–20 Coins", rule: "Once per adventure, when a creature uses an ability on you, it fails.", boosts: ["brave", "mirror", "rock"] },
  { id: "double-tokens", name: "Double tokens", tier: "uncommon", price: "25–35 Coins", rule: "Each [trait] token you spend counts as 2.", boosts: ["strong", "dragon", "friendship"] },
  { id: "two-at-once", name: "Two at once", tier: "uncommon", price: "30 Coins", rule: "When you use this item, one roll counts against 2 creatures you can see. You gain 1 success against each creature you beat.", boosts: ["thunder", "stinky", "rock", "music"] },
  { id: "pocket-refill", name: "Pocket refill", tier: "uncommon", price: "15 Coins", rule: "Once per adventure, restore 3 lost tokens.", boosts: ["happy", "sun", "cookie", "plant", "water"] },
  { id: "lucky-streak", name: "Lucky streak", tier: "uncommon", price: "20 Coins", rule: "A roll of 19 or 20 counts as a Spectacular Success.", boosts: ["lucky", "star", "sparkle"] },
  { id: "comeback", name: "Comeback", tier: "uncommon", price: "10 Coins", rule: "After you fail an action roll, you get +2 on your next roll of that same trait.", boosts: ["brave", "grumpy", "dragon", "fire"] },
  { id: "super-senses", name: "Super senses", tier: "rare", price: "10–20 Coins", rule: "A clear sensing power: see in the dark, see a creature's Difficulty and abilities, or always find hidden doors and things.", boosts: ["star", "moon", "sun", "ghost", "fortune"] },
  { id: "every-roll", name: "Every roll", tier: "rare", price: "50 Coins", rule: "You get +1 on all action rolls.", boosts: ["star", "brave", "fortune"] },
  { id: "coins-to-tokens", name: "Coins into tokens", tier: "rare", price: "10 Coins", rule: "Any time you make an action roll, you may turn 1 Coin into 1 Smart, Sneaky or Tough token for that roll.", boosts: ["lucky", "robot", "time"] },
  { id: "star-roll", name: "Star roll", tier: "rare", price: "30 Coins", rule: "Once per adventure, turn any one of your action rolls into a natural 20.", boosts: ["star", "fortune", "lucky"] },
];

export const EQUIPMENT_ONCE: Pattern[] = [
  { id: "refill", name: "Refill", tier: "common", price: "10 Coins", rule: "Restore 5 lost tokens.", boosts: ["happy", "friendship", "cookie", "sun", "water", "plant"] },
  { id: "big-boost", name: "Big boost", tier: "common", price: "5 Coins", rule: "Get +10 on your next action roll.", boosts: ["brave", "cookie", "star", "strong", "fire"] },
  { id: "silly-fix", name: "Silly fix", tier: "common", price: "1–2 Coins", rule: "A small handy power: glue two things together, unstick anything, make something glow, or freeze a puddle solid.", boosts: ["sticky", "bubble", "sparkle", "ice", "plant"] },
  { id: "soft-landing", name: "Soft landing", tier: "common", price: "2 Coins", rule: "Use right after you lose tokens: lose 1 fewer. Using this does not take your turn.", boosts: ["cotton-candy", "bubble", "lucky"] },
  { id: "sure-thing", name: "Sure thing", tier: "uncommon", price: "5 Coins", rule: "Use instead of rolling: your roll counts as a 10.", boosts: ["sparkle", "lucky", "fortune"] },
  { id: "coin-toss", name: "Coin toss", tier: "uncommon", price: "5 Coins", rule: "Instead of an action roll against Difficulty 20 or less, flip a coin. Call it right and you succeed.", boosts: ["lucky", "fortune", "giggle"] },
  { id: "block", name: "Block", tier: "uncommon", price: "7 Coins", rule: "Use right when a creature uses an ability on you: the ability fails.", boosts: ["mirror", "brave", "bubble"] },
  { id: "wild-token", name: "Wild token", tier: "uncommon", price: "3 Coins", rule: "Counts as 1 token of any trait.", boosts: ["rainbow", "star", "sparkle"] },
  { id: "sleepy-time", name: "Sleepy time", tier: "uncommon", price: "10 Coins", rule: "Succeed on a Sneaky roll against a creature to gain 1 success, and it falls asleep for 1 turn (2 turns if you beat its Difficulty by 5 or more).", boosts: ["sleepy", "moon", "music"] },
  { id: "double-up", name: "Double up", tier: "rare", price: "10 Coins", rule: "Use right after a successful action roll: double the successes it earned.", boosts: ["thunder", "dragon", "mirror"] },
  { id: "zoom-home", name: "Zoom home", tier: "rare", price: "10 Coins", rule: "Teleport you and your friends to a place you've been before.", boosts: ["portal", "time"] },
  { id: "quick-power", name: "Quick power", tier: "rare", price: "5 Coins", rule: "For 1 minute you can [fly, turn invisible, or breathe underwater].", boosts: ["ghost", "wind", "water", "bubble"] },
  { id: "everybody-freeze", name: "Everybody freeze", tier: "rare", price: "5 Coins", rule: "Every creature misses its next turn. Each Player (including you) must succeed on a Tough roll (Difficulty 15) or miss their next turn too.", boosts: ["stinky", "sneeze", "giggle", "time"] },
];

// ---------------------------------------------------------------- pets
export const PET_BONUSES: Pattern[] = [
  { id: "little-buddy", name: "Little buddy", tier: "main", price: "low", rule: "+1 or +2 to your maximum [trait] tokens.", boosts: ["smart", "sneaky", "strong", "helpful", "tiny", "small"] },
  { id: "big-bonus", name: "Big bonus", tier: "main", price: "high", rule: "+4 to +8 to your maximum [trait] tokens.", boosts: ["strong", "helpful", "smart", "sneaky", "big"] },
  { id: "all-rounder", name: "All-rounder", tier: "main", price: "medium", rule: "+1 to your maximum tokens in every trait, plus +1 more to any trait you choose.", boosts: ["magic", "lucky", "helpful"] },
];

export const PET_POWERS: Pattern[] = [
  { id: "trick", name: "Buddy with a trick", tier: "main", rule: "Once per adventure, ONE of: let you re-roll a failed roll with +1; restore up to 5 lost [trait] tokens the moment you spend your last one; or +5 on one roll that involves talking.", boosts: ["talker", "magic", "lucky", "helpful"] },
  { id: "treasure-sniffer", name: "Treasure sniffer", tier: "main", rule: "Every time you succeed on a [trait] roll, it finds you 1 Coin.", boosts: ["treasure-sniffer", "finder", "sneaky"] },
  { id: "scout", name: "Scout", tier: "main", rule: "It can fly or sneak ahead, and you can see what it sees.", boosts: ["flying", "sneaky", "invisible", "tiny"] },
  { id: "protector", name: "Protector", tier: "main", rule: "Once per adventure, it blocks 1 creature ability used on you.", boosts: ["protector", "strong"] },
  { id: "do-over", name: "Do-over helper", tier: "main", rule: "You may spend 2 Helpful tokens to let you or any friend re-roll a d20 roll.", boosts: ["helpful", "lucky", "magic"] },
  { id: "distraction", name: "Distraction", tier: "main", rule: "Once per adventure, it distracts a creature by doing something amazing, letting you re-roll a failed roll with +1.", boosts: ["talker", "sneaky", "lucky"] },
  { id: "digger", name: "Digger", tier: "main", rule: "It can dig a tunnel through dirt or stone to almost anywhere nearby.", boosts: ["strong", "finder"] },
  { id: "ride", name: "Ride", tier: "main", rule: "You can ride it. It carries you fast over land (or through the air if it can fly).", boosts: ["big", "strong", "flying"] },
  { id: "future-seer", name: "Future-seer", tier: "rare", rule: "When a creature uses an ability on you, make a Smart roll against the creature's Difficulty. On a success, the ability has no effect.", boosts: ["future-seer", "magic", "smart"] },
  { id: "teleporter", name: "Teleporter", tier: "rare", rule: "It can make a one-use orb (costs 7 Coins) that teleports you straight back to wherever the pet is.", boosts: ["teleport", "magic"] },
  { id: "pocket-shop", name: "Pocket shop", tier: "rare", rule: "It carries a tiny shop on its back where you can buy any equipment item, anywhere.", boosts: ["treasure-sniffer", "helpful", "talker"] },
  { id: "vanishing", name: "Vanishing friend", tier: "rare", rule: "Once per adventure, it makes you invisible until you make your next action roll.", boosts: ["invisible", "sneaky", "magic"] },
];

// ---------------------------------------------------------------- drawing
function draw(pool: Pattern[], picked: Set<string>, extraBoosts: string[] = [], exclude: Set<string> = new Set()) {
  const options = pool.filter((p) => !exclude.has(p.id));
  const weights = options.map((p) => {
    const matches =
      p.boosts.filter((b) => picked.has(b)).length + extraBoosts.filter((id) => id === p.id).length;
    return WEIGHT[p.tier] * Math.pow(3, matches);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}

/** Item buttons: which are use-once, and which patterns each item type makes more likely. */
export type ItemInfo = { once: boolean; boosts: string[] };

export type Plan = { kind: Kind; text: string; consumable?: boolean; patternIds: string[] };

/**
 * Picks the patterns for one card from the kid's buttons.
 * `choices` are the picked button ids; `itemInfo` describes the picked item type (equipment).
 */
export function drawPlan(
  kind: Kind,
  choices: Record<string, string[]>,
  difficulty?: number,
  itemInfo?: ItemInfo | null
): Plan {
  const picked = new Set(Object.values(choices).flat());
  const fmt = (label: string, p: Pattern) =>
    `${label}: "${p.name}": ${p.rule}${p.price ? ` (usual price: ${p.price})` : ""}`;

  if (kind === "creature") {
    const d = difficulty ?? 10;
    const ok = (p: Pattern) => !p.minDifficulty || d >= p.minDifficulty;
    const abilities = CREATURE_ABILITIES.filter(ok);
    // Two different abilities. (Excluding the first also stops two "Follow-up chains" pairing up.)
    const first = draw(abilities, picked);
    const second = draw(abilities, picked, [], new Set([first.id]));
    const special = draw(CREATURE_SPECIALS.filter(ok), picked);
    return {
      kind,
      patternIds: [first.id, second.id, special.id],
      text: [fmt("Ability 1", first), fmt("Ability 2", second), fmt("Special", special)].join("\n"),
    };
  }

  if (kind === "equipment") {
    let pool: Pattern[];
    let consumable: boolean;
    if (itemInfo) {
      consumable = itemInfo.once;
      pool = consumable ? EQUIPMENT_ONCE : EQUIPMENT_KEEP;
    } else {
      // No item picked (a drawing or idea instead): either kind can come up.
      const p = draw([...EQUIPMENT_KEEP, ...EQUIPMENT_ONCE], picked);
      consumable = EQUIPMENT_ONCE.includes(p);
      return {
        kind,
        consumable,
        patternIds: [p.id],
        text: `${fmt("Effect", p)}\nType: ${consumable ? "consumable (one-time use)" : "permanent (keep forever)"}`,
      };
    }
    const p = draw(pool, picked, itemInfo.boosts);
    return {
      kind,
      consumable,
      patternIds: [p.id],
      text: `${fmt("Effect", p)}\nType: ${consumable ? "consumable (one-time use)" : "permanent (keep forever)"}`,
    };
  }

  // pets: 1 bonus + 1 power. Ride only for Big pets.
  const big = picked.has("big");
  const bonus = draw(PET_BONUSES, picked);
  const power = draw(PET_POWERS, picked, [], big ? new Set() : new Set(["ride"]));
  return {
    kind,
    patternIds: [bonus.id, power.id],
    text: [fmt("Bonus", bonus), fmt("Power", power)].join("\n"),
  };
}
