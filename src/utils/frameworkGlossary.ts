export type FrameworkGlossarySection = {
  label: string;
  tags: string[];
};

export type FrameworkGlossaryTooltip = {
  framework: string;
  hint?: string | null;
  sections: FrameworkGlossarySection[];
};

const frameworkGlossaries: Record<string, FrameworkGlossaryTooltip> = {
  Ice: {
    framework: "Ice",
    sections: [
      {
        label: "Ice Structures",
        tags: ["Ice Cage", "Ice Column", "Ice Barriers"],
      },
    ],
  },
  Electricity: {
    framework: "Electricity",
    sections: [
      {
        label: "Completing a Circuit",
        tags: ["Consuming Negative Ions"],
      },
    ],
  },
  Fire: {
    framework: "Fire",
    sections: [
      {
        label: "Burning effects",
        tags: ["Clinging Flames", "Leaping Flames", "Pyre Patch", "Fire Snake"],
      },
    ],
  },
  Laser_Sword: {
    framework: "Laser Sword",
    sections: [
      {
        label: "Radiation",
        tags: ["Plasma Burn", "Burn Through", "Disintegrate", "Overheat"],
      },
    ],
  },
  Unarmed: {
    framework: "Unarmed",
    sections: [
      {
        label: "Chi Energy effects",
        tags: [
          "Chi Flame",
          "Lithe",
          "Quick Maneuvering",
          "Ebb and Flow",
          "Nimble Movements",
          "Sudden Strike",
          "Dragon Rush",
          "Bountiful Chi Resurgence",
        ],
      },
    ],
  },
  Darkness: {
    framework: "Darkness",
    sections: [
      {
        label: "Mental States",
        tags: ["Fear", "Stress", "Regret", "Dependency", "Ego Leech", "Despondency"],
      },
    ],
  },
  Telekinesis: {
    framework: "Telekinesis",
    sections: [
      {
        label: "Mental States",
        tags: ["Fear", "Stress", "Regret", "Dependency", "Ego Leech", "Despondency"],
      },
    ],
  },
  Telepathy: {
    framework: "Telepathy",
    sections: [
      {
        label: "Mental States",
        tags: ["Fear", "Stress", "Regret", "Dependency", "Ego Leech", "Despondency"],
      },
      {
        label: "Controls",
        tags: ["Stun", "Paralyze", "Incapacitate", "Sleep", "Root", "Confuse"],
      },
    ],
  },
  Single_Blade: {
    framework: "Single Blade",
    sections: [
      {
        label: "Wounds",
        tags: ["Shredded", "Bleed", "Open Wound", "Deep Wound", "Swallowtail Cut"],
      },
    ],
  },
  Bestial_Supernatural: {
    framework: "Bestial Supernatural",
    sections: [
      {
        label: "Wounds",
        tags: ["Shredded", "Bleed", "Open Wound", "Deep Wound", "Swallowtail Cut"],
      },
    ],
  },
  Sorcery: {
    framework: "Sorcery",
    sections: [
      {
        label: "Curses",
        tags: [
          "Jinxed",
          "Hexed",
          "Debilitating Poison",
          "Corruption",
          "Illuminated",
          "Devoid",
        ],
      },
      {
        label: "Enchantements",
        tags: [
          "Spellcaster toggle form",
          "Rune",
          "Illumination",
          "Mystified",
          "Light Everlasting",
          "Detect",
        ],
      },
    ],
  },
  Infernal_Supernatural: {
    framework: "Infernal Supernatural",
    sections: [
      {
        label: "Poisons",
        tags: [
          "Deadly Poison",
          "Debilitating Poison",
          "Noxious Poison",
          "Infect",
        ],
      },
    ],
  },
};

export function getFrameworkGlossaryTooltip(
  frameworkId: string,
  fallbackFrameworkName?: string,
  hint?: string | null,
) {
  const glossary = frameworkGlossaries[frameworkId];

  if (!glossary && !fallbackFrameworkName) {
    return null;
  }

  return {
    framework: glossary?.framework ?? fallbackFrameworkName ?? frameworkId,
    hint: hint ?? null,
    sections: glossary?.sections ?? [],
  };
}

export function getFrameworkGlossaryTooltipAttribute(
  frameworkId: string,
  fallbackFrameworkName?: string,
  hint?: string | null,
) {
  const glossary = getFrameworkGlossaryTooltip(
    frameworkId,
    fallbackFrameworkName,
    hint,
  );

  return glossary ? JSON.stringify(glossary) : undefined;
}
