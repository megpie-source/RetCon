const effectGroupAliases: Record<string, string[]> = {
  "burning": [
    "Clinging Flames",
    "Leaping Flames",
    "Pyre Patch",
    "Fire Snake",
  ],
  "burning effects": [
    "Clinging Flames",
    "Leaping Flames",
    "Pyre Patch",
    "Fire Snake",
  ],
  "chi energy": [
    "Chi Flame",
    "Lithe",
    "Quick Maneuvering",
    "Ebb and Flow",
    "Nimble Movements",
    "Sudden Strike",
    "Dragon Rush",
    "Bountiful Chi Resurgence",
  ],
  "curses": [
    "Jinxed",
    "Hexed",
    "Debilitating Poison",
    "Corruption",
    "Illuminated",
    "Devoid",
  ],
  "curse": [
    "Jinxed",
    "Hexed",
    "Debilitating Poison",
    "Corruption",
    "Illuminated",
    "Devoid",
  ],
  "control": [
    "Stun",
    "Paralyze",
    "Incapacitate",
    "Sleep",
    "Root",
    "Confuse",
  ],
  "elemental damage": [
    "Fire",
    "Toxic",
    "Cold",
  ],
  "enchantments": [
    "Spellcaster",
    "Rune",
    "Illumination",
    "Mystified",
    "Light Everlasting",
  ],
  "enchantment": [
    "Spellcaster",
    "Rune",
    "Illumination",
    "Mystified",
    "Light Everlasting",
  ],
  "energy damage": [
    "Electrical",
    "Sonic",
    "Particle",
  ],
  "ice structures": [
    "Ice Cage",
    "Ice Column",
    "Ice Barriers",
  ],
  "ice structure": [
    "Ice Cage",
    "Ice Column",
    "Ice Barriers",
  ],
  "mental states": [
    "Fear",
    "Stress",
    "Regret",
    "Dependency",
    "Ego Leech",
    "Despondency",
  ],
  "mental state": [
    "Fear",
    "Stress",
    "Regret",
    "Dependency",
    "Ego Leech",
    "Despondency",
  ],
  "paranormal damage": [
    "Ego",
    "Magic",
    "Dimensional",
  ],
  "hold": ["Stun", "Paralyze", "Sleep"],
  "held": ["Stun", "Paralyze", "Sleep"],
  "holding": ["Stun", "Paralyze", "Sleep"],
  "holds": ["Stun", "Paralyze", "Sleep"],
  "paralyze": ["Paralyze"],
  "paralyzed": ["Paralyze"],
  "paralyzing": ["Paralyze"],
  "paralysis": ["Paralyze"],
  "physical damage": [
    "Slashing",
    "Piercing",
    "Crushing",
  ],
  "poisons": [
    "Deadly Poison",
    "Debilitating Poison",
    "Noxious Poison",
    "Infects",
  ],
  "poison": [
    "Deadly Poison",
    "Debilitating Poison",
    "Noxious Poison",
    "Infects",
  ],
  "radiation": [
    "Plasma Burn",
    "Burn Through",
    "Disintegrate",
    "Overheat",
  ],
  "wounds": [
    "Shredded",
    "Bleed",
    "Open Wound",
    "Deep Wound",
    "Swallowtail Cut",
  ],
  "wound": [
    "Shredded",
    "Bleed",
    "Open Wound",
    "Deep Wound",
    "Swallowtail Cut",
  ],
};

function normalizeEffectGroupText(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/giu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const normalizedEffectGroupAliases = new Map(
  Object.entries(effectGroupAliases).map(([groupName, tags]) => [
    normalizeEffectGroupText(groupName),
    tags,
  ]),
);

export function getEffectGroupTags(query: string) {
  return normalizedEffectGroupAliases.get(normalizeEffectGroupText(query)) ?? [];
}
