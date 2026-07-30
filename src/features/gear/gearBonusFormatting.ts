import type { SuperStat } from "@/types/character";
import type { GearBonus, GearModRank } from "@/types/gear";

export const statBonusOrder = [
  "STR",
  "DEX",
  "CON",
  "INT",
  "EGO",
  "PRE",
  "REC",
  "END",
];

export const statBonusOrderIndex = new Map(
  statBonusOrder.map((stat, index) => [stat, index]),
);

const statNameToCode = new Map<string, string>([
  ["strength", "STR"],
  ["dexterity", "DEX"],
  ["constitution", "CON"],
  ["intelligence", "INT"],
  ["ego", "EGO"],
  ["presence", "PRE"],
  ["recovery", "REC"],
  ["endurance", "END"],
]);

const percentageBonusTypes = new Set([
  "armor_penetration",
  "bonus_damage",
  "bonus_heal",
  "bonus_healing",
  "damage_bonus",
  "healing_bonus",
  "knock_and_repel",
  "knock_and_repel_resistance",
  "knock_repel",
  "knock_repel_resistance",
  "knockrepel",
  "knockrepel_resistance",
  "resistance",
  "threat",
]);

const bonusTypeLabels = new Map<string, string>([
  ["armor_penetration", "Armor Penetration"],
  ["bonus_damage", "Damage Bonus"],
  ["bonus_heal", "Healing Bonus"],
  ["bonus_healing", "Healing Bonus"],
  ["cc_resistance", "CC Resistance"],
  ["damage_bonus", "Damage Bonus"],
  ["healing_bonus", "Healing Bonus"],
  ["knock_and_repel", "Knock and Repel"],
  ["knock_and_repel_resistance", "Knock and Repel Resistance"],
  ["knock_repel", "Knock and Repel"],
  ["knock_repel_resistance", "Knock and Repel Resistance"],
  ["knockrepel", "Knock and Repel"],
  ["knockrepel_resistance", "Knock and Repel Resistance"],
  ["max_energy", "Max Energy"],
  ["max_hp", "Max HP"],
]);

function formatBonusTypePart(value: string) {
  if (value.toLowerCase() === "celesial") {
    return "Celestial";
  }

  if (value.toLowerCase() === "munition") {
    return "Munitions";
  }

  return value
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) =>
      part === part.toUpperCase() && part.length > 1
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join(" ");
}

function normalizeBonusType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/gu, "_");
}

function getSuperStatCode(stat: SuperStat | null | undefined) {
  if (!stat || stat.id <= 0) {
    return null;
  }

  return statNameToCode.get(stat.name.trim().toLowerCase()) ?? null;
}

function getSelectedSuperStatCodes(selectedSuperStats: (SuperStat | null)[]) {
  return selectedSuperStats
    .map((stat) => getSuperStatCode(stat))
    .filter((stat): stat is string => Boolean(stat));
}

export function getResolvedBonusTypes(
  type: string,
  selectedSuperStats: (SuperStat | null)[],
) {
  const normalizedType = normalizeBonusType(type);

  if (normalizedType === "primary_superstat") {
    return [getSuperStatCode(selectedSuperStats[0]) ?? "Primary_Superstat"];
  }

  if (
    normalizedType === "secondary_superstat" ||
    normalizedType === "secondary_superstats"
  ) {
    const resolvedSecondaryStats = [selectedSuperStats[1], selectedSuperStats[2]]
      .map((stat) => getSuperStatCode(stat))
      .filter((stat): stat is string => Boolean(stat));

    return resolvedSecondaryStats.length < 2
      ? [...resolvedSecondaryStats, "Secondary_Superstat"]
      : resolvedSecondaryStats;
  }

  if (normalizedType === "all_stats") {
    return statBonusOrder;
  }

  if (normalizedType === "super_stats") {
    const resolvedStats = getSelectedSuperStatCodes(selectedSuperStats);

    return resolvedStats.length < 3
      ? [...resolvedStats, "Super_Stats"]
      : resolvedStats;
  }

  if (normalizedType === "non_super_stats") {
    const selectedStatCodes = new Set(getSelectedSuperStatCodes(selectedSuperStats));
    const nonSuperStats = statBonusOrder.filter(
      (stat) => !selectedStatCodes.has(stat),
    );

    return selectedStatCodes.size < 3
      ? ["Non_Super_Stats"]
      : nonSuperStats;
  }

  return [type];
}

export function formatBonusType(value: string) {
  const normalizedValue = String(value).trim();
  const upperValue = normalizedValue.toUpperCase();
  const normalizedType = normalizeBonusType(normalizedValue);

  if (statBonusOrderIndex.has(upperValue)) {
    return upperValue;
  }

  const label = bonusTypeLabels.get(normalizedType);

  if (label) {
    return label;
  }

  if (normalizedType.startsWith("damage_bonus_")) {
    return `${formatBonusTypePart(normalizedValue.slice("Damage_Bonus_".length))} Damage Bonus`;
  }

  if (normalizedType.startsWith("armor_penetration_")) {
    return `${formatBonusTypePart(normalizedValue.slice("Armor_Penetration_".length))} Armor Penetration`;
  }

  if (normalizedType.startsWith("threat_")) {
    return `${formatBonusTypePart(normalizedValue.slice("Threat_".length))} Threat`;
  }

  return formatBonusTypePart(normalizedValue);
}

export function parseGearBonusValue(value: number | string | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value.replace(",", "."));

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

export function getGearBonusValue(bonus: GearBonus) {
  return parseGearBonusValue(bonus.value);
}

export function getRankedGearBonusValue(
  bonus: GearBonus,
  rank: GearModRank | number,
) {
  return parseGearBonusValue(bonus.values_by_rank?.[String(rank)]);
}

export function formatBonusValue(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/u, "");
}

function isPercentageBonusType(type: string | undefined) {
  if (!type) {
    return false;
  }

  const normalizedType = normalizeBonusType(type);

  return (
    percentageBonusTypes.has(normalizedType) ||
    normalizedType.startsWith("bonus_") && normalizedType.endsWith("_damage") ||
    normalizedType.startsWith("armor_penetration_") ||
    normalizedType.startsWith("damage_bonus_") ||
    normalizedType.startsWith("threat_")
  );
}

function appendPercentIfNeeded(value: string, type: string | undefined) {
  return isPercentageBonusType(type) && !value.includes("%")
    ? `${value}%`
    : value;
}

export function formatSignedBonusValue(
  value: number | string,
  type?: string,
) {
  if (typeof value === "number") {
    const formattedValue = formatBonusValue(Math.abs(value));
    const signedValue = value < 0 ? `-${formattedValue}` : `+${formattedValue}`;

    return appendPercentIfNeeded(signedValue, type);
  }

  const normalizedValue = String(value).trim();
  const signedValue = normalizedValue.startsWith("-")
    ? normalizedValue
    : `+${normalizedValue}`;

  return appendPercentIfNeeded(signedValue, type);
}

export function formatResolvedBonusSegments(
  bonus: GearBonus,
  value: number | string | null,
  selectedSuperStats: (SuperStat | null)[],
) {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  return getResolvedBonusTypes(bonus.type, selectedSuperStats).map(
    (type) => `${formatSignedBonusValue(value, type)} ${formatBonusType(type)}`,
  );
}

export function formatBonusSegment(
  bonus: GearBonus,
  value: number | string | null,
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return `${formatSignedBonusValue(value, bonus.type)} ${formatBonusType(bonus.type)}`;
}
