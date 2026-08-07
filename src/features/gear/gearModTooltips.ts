import type { GearBonus, GearMod, GearModRank } from "@/types/gear";
import {
  cleanMultilineTooltipText,
  replaceTooltipBulletMarkersWithLineBreaks,
} from "@/shared/utils/tooltipText";
import {
  formatBonusSegment,
  formatSignedBonusValue,
  statBonusOrderIndex,
} from "./gearBonusFormatting";

const modRanks = [5, 7, 9] satisfies GearModRank[];

function formatBonusSegments(
  bonus: GearBonus,
  rank: GearModRank,
) {
  const value = bonus.values_by_rank?.[String(rank)];

  if (value === undefined || value === null || value === "") {
    return [];
  }

  const segment = formatBonusSegment(bonus, value);

  return segment ? [segment] : [];
}

function formatRankBonusSegments(
  mod: GearMod,
  rank: GearModRank,
) {
  const statLine = formatStatModRankLine(mod, rank);

  if (statLine) {
    return [statLine];
  }

  return mod.bonuses.flatMap((bonus) =>
    formatBonusSegments(bonus, rank),
  );
}

function getRankValueForBonus(bonus: GearBonus, rank: GearModRank) {
  const value = bonus.values_by_rank?.[String(rank)];

  return value === undefined || value === null || value === "" ? null : value;
}

function getStatBonusCode(bonus: GearBonus) {
  const code = bonus.type.trim().toUpperCase();

  return statBonusOrderIndex.has(code) ? code : null;
}

function formatStatModRankLine(
  mod: GearMod,
  rank: GearModRank,
) {
  if (mod.bonuses.length < 2) {
    return null;
  }

  const statBonuses = mod.bonuses.map((bonus) => ({
    code: getStatBonusCode(bonus),
    value: getRankValueForBonus(bonus, rank),
  }));

  if (
    statBonuses.some(
      (bonus) => bonus.code === null || bonus.value === null,
    )
  ) {
    return null;
  }

  const [firstBonus] = statBonuses;
  const hasSharedValue = statBonuses.every(
    (bonus) => String(bonus.value) === String(firstBonus.value),
  );

  if (!hasSharedValue || firstBonus.value === null) {
    return null;
  }

  return `${formatSignedBonusValue(firstBonus.value)} ${statBonuses
    .map((bonus) => bonus.code)
    .join("/")}`;
}

function formatModRankLine(
  mod: GearMod,
  rank: GearModRank,
) {
  const segments = formatRankBonusSegments(mod, rank);

  if (segments.length === 0) {
    return null;
  }

  if (segments.length === 1) {
    return `R${rank}: ${segments[0]}`;
  }

  return [`R${rank}:`, ...segments].join("\n");
}

function getPrimaryRankValue(mod: GearMod, rank: GearModRank) {
  return mod.bonuses
    .map((bonus) => bonus.values_by_rank?.[String(rank)] ?? null)
    .find((value) => value !== null && value !== undefined && value !== "");
}

function formatRankValueTokenFallback(mod: GearMod, suffix = "") {
  return modRanks
    .map((rank) => {
      const value = getPrimaryRankValue(mod, rank);

      return value === undefined || value === null || value === ""
        ? null
        : `R${rank}: ${value}${suffix}`;
    })
    .filter((line): line is string => Boolean(line))
    .join(" / ");
}

function applyRankValueToken(
  value: string | null,
  mod: GearMod,
  rank: GearModRank | null,
) {
  if (!value?.includes("%rank_value%")) {
    return value;
  }

  return value.replace(/%rank_value%(\s*%)?/giu, (_match, percentSuffix) => {
    const suffix = percentSuffix ? "%" : "";

    return rank === null
      ? formatRankValueTokenFallback(mod, suffix)
      : `${getPrimaryRankValue(mod, rank) ?? ""}${suffix}`;
  });
}

function hasRankValueToken(value: string | null | undefined) {
  return String(value ?? "").includes("%rank_value%");
}

function formatRankValues(bonus: GearBonus | undefined) {
  const valuesByRank = bonus?.values_by_rank;

  if (!valuesByRank) {
    return null;
  }

  return [valuesByRank["5"], valuesByRank["7"], valuesByRank["9"]]
    .filter((value) => value !== undefined && value !== null)
    .join(" / ");
}

function formatGenericModBonus(
  mod: GearMod,
) {
  const formattedBonuses = mod.bonuses
    .flatMap((bonus) => {
      const rankValues = formatRankValues(bonus);
      const segment = formatBonusSegment(bonus, rankValues);

      return segment ? [segment.replace(/^\+/u, "")] : [];
    })
    .filter(Boolean);

  if (formattedBonuses.length === 0) {
    return "No bonus data";
  }

  return formattedBonuses.join(" / ");
}

function cleanModTooltipText(
  value: string | null | undefined,
  mod: GearMod,
  rank: GearModRank | null = null,
) {
  return (
    replaceTooltipBulletMarkersWithLineBreaks(
      applyRankValueToken(cleanMultilineTooltipText(value), mod, rank),
    )?.trim() ?? null
  );
}

function hasGeneratedRankTooltip(mod: GearMod) {
  return !cleanModTooltipText(mod.tooltip, mod) && mod.bonuses.length > 0;
}

export function formatGearModTooltipText(mod: GearMod) {
  const manualTooltipText = cleanModTooltipText(mod.tooltip, mod);
  const bonusText = hasRankValueToken(mod.tooltip)
    ? null
    : hasGeneratedRankTooltip(mod)
      ? modRanks
          .map((rank) => formatModRankLine(mod, rank))
          .filter(Boolean)
          .join("\n")
      : formatGenericModBonus(mod);
  const lines = [
    bonusText,
    manualTooltipText,
    mod.source.length > 0 ? `Source: ${mod.source.join(", ")}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

export function formatGearModRankTooltipText(
  mod: GearMod,
  rank: GearModRank | null,
) {
  if (rank === null) {
    return formatGearModTooltipText(mod);
  }

  const manualTooltipText = cleanModTooltipText(mod.tooltip, mod, rank);

  if (manualTooltipText) {
    const lines = [
      hasRankValueToken(mod.tooltip)
        ? null
        : formatGenericModBonus(mod),
      manualTooltipText,
      mod.source.length > 0 ? `Source: ${mod.source.join(", ")}` : null,
    ].filter(Boolean);

    return lines.join("\n");
  }

  const segments = formatRankBonusSegments(mod, rank);

  return segments.length > 0
    ? segments.join("\n")
    : formatGearModTooltipText(mod);
}
