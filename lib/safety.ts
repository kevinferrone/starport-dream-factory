// Shared checks that are safe to use in the browser and on the server.

/** No weapons or sharp things anywhere on a card. */
export const WEAPONS =
  /\b(guns?|laser ?guns?|ray ?guns?|blasters?|pistols?|rifles?|swords?|knife|knives|daggers?|spears?|arrows?|axes?|blades?|lasers?)\b/i;
