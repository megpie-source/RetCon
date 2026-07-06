import type { Power } from "@/types/powers";
import type { Advantage } from "@/types/advantages";
import {
  cleanMultilineTooltipText,
  cleanTooltipText,
  formatTooltipLabel,
} from "./tooltipText";
import { getNormalizedPowerType, getPowerType } from "./powerTypes";
import { getAdvantageDamageTypes } from "@/utils/powerDamageTypes";
import {
  getSearchTags,
  getTooltipTagBadges,
  type TooltipTagBadge,
} from "@/utils/powerTags";

export type AdvantageTooltipData = {
  id: number;
  name: string;
  pointsCost: number | null;
  tooltip: string | null;
  tags: TooltipTagBadge[];
  applyTags: string[];
  damageTypes: string[];
  refreshTags: string[];
  synergyTags: string[];
};

export type PowerTooltipData = {
  title: string;
  framework: string | null;
  tier: string | null;
  powerType: string | null;
  activationType: string | null;
  metrics: string[];
  rangeTags: string[];
  tags: TooltipTagBadge[];
  effects: string[];
  damageMods: string[];
  parentPowers: string[];
  sources: string[];
  advantages: AdvantageTooltipData[];
  fallbackText: string | null;
};

function formatSeconds(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }

    return `${value} sec`;
  }

  const normalizedValue = String(value).trim().replace(/,/g, ".");

  if (!/\d/.test(normalizedValue)) {
    return null;
  }

  return `${normalizedValue} sec`;
}

function formatPowerCost(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalizedValue = String(value).trim().replace(/,/g, ".");

  if (!/\d/.test(normalizedValue)) {
    return null;
  }

  return /%\s*HP\b/i.test(normalizedValue)
    ? `Cost ${normalizedValue}`
    : `Cost ${normalizedValue} Energy`;
}

function formatTier(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value === -1) {
    return "Energy Builder";
  }

  if (value === 4) {
    return "Ultimate";
  }

  return `Tier ${value}`;
}

function isPowerVariantDevice(power: Power) {
  return power.powerset_id?.toLowerCase() === "pvd";
}

function formatHeaderMeta(power: Power) {
  if (isPowerVariantDevice(power)) {
    return power.tier === 4 ? "Ultimate Variant" : "Power Variant";
  }

  return formatTier(power.tier);
}

function formatTitle(power: Power) {
  const normalizedPowerType = getNormalizedPowerType(power);

  if (
    normalizedPowerType !== "TOGGLE_FORM" &&
    normalizedPowerType !== "ENERGY_UNLOCK"
  ) {
    return power.name;
  }

  const scalingStats = (power.scaling_stats ?? [])
    .map((stat) => stat.trim().toUpperCase())
    .filter(Boolean);

  return scalingStats.length > 0
    ? `${power.name} - ${scalingStats.join(" - ")}`
    : power.name;
}

function isChargeActivationType(value: string | null | undefined) {
  const normalizedValue = value?.replace(/[_-]/g, " ").trim().toLowerCase();

  return (
    normalizedValue === "blast" ||
    normalizedValue === "charge" ||
    normalizedValue === "full charge"
  );
}

function getAdvantageTooltipData(
  power: Power,
  advantagesById: ReadonlyMap<number, Advantage> | null | undefined,
) {
  if (!advantagesById) {
    return [];
  }

  return power.advantages
    .map((advantageId) => advantagesById.get(advantageId))
    .filter((advantage): advantage is Advantage => Boolean(advantage))
    .filter((advantage) => advantage.name !== "Rank 2" && advantage.name !== "Rank 3")
    .map((advantage) => ({
      id: advantage.advantage_id,
      name: advantage.name,
      pointsCost: advantage.points_cost,
      tooltip: cleanMultilineTooltipText(advantage.tooltip),
      tags: getTooltipTagBadges(advantage)
        .map((tag) => ({
          ...tag,
          label: formatTooltipLabel(tag.label) ?? "",
        }))
        .filter((tag) => Boolean(tag.label)),
      applyTags: getSearchTags(advantage, ["apply"]),
      damageTypes: getAdvantageDamageTypes(advantage),
      refreshTags: getSearchTags(advantage, ["refresh"]),
      synergyTags: getSearchTags(advantage, ["synergy"]),
    }));
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function stripTrailingPeriod(value: string) {
  return value.replace(/\.$/, "").trim();
}

function splitEffects(text: string) {
  const normalizedText = text.replace(/^Features:\s*/i, "").trim();

  if (!normalizedText) {
    return [];
  }

  if (/(?:^|\s)[+-]\s+/.test(normalizedText)) {
    return normalizedText
      .split(/(?:^|\s)(?=[+-]\s+)/)
      .map((effect) => effect.replace(/^[+-]\s*/, "").trim())
      .filter(Boolean);
  }

  return splitSentences(normalizedText);
}

function splitSourceValues(value: string[] | string | null | undefined) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((source) => String(source).split(";"))
    .map((source) => source.trim())
    .filter(Boolean);
}

function getParentPowerNames(
  power: Power,
  powersById: ReadonlyMap<number, Power> | null | undefined,
) {
  if (!isPowerVariantDevice(power) || !powersById) {
    return [];
  }

  return (power.power_dependency ?? [])
    .map((powerId) => powersById.get(powerId)?.name)
    .filter((name): name is string => Boolean(name));
}

function getDamageModNames(
  power: Power,
  powersById: ReadonlyMap<number, Power> | null | undefined,
  damageModsByFramework: ReadonlyMap<string, string> | null | undefined,
) {
  if (!isPowerVariantDevice(power) || !powersById || !damageModsByFramework) {
    return [];
  }

  return Array.from(
    new Set(
      (power.power_dependency ?? [])
        .map((powerId) => powersById.get(powerId)?.framework_id)
        .filter((frameworkId): frameworkId is string => Boolean(frameworkId))
        .map((frameworkId) => damageModsByFramework.get(frameworkId))
        .filter((name): name is string => Boolean(name)),
    ),
  );
}

export function getPowerTooltipData(
  power: Power | null | undefined,
  advantagesById?: ReadonlyMap<number, Advantage> | null,
  powersById?: ReadonlyMap<number, Power> | null,
  damageModsByFramework?: ReadonlyMap<string, string> | null,
): PowerTooltipData | null {
  if (!power) {
    return null;
  }

  const tooltipText = cleanTooltipText(power.tooltip);
  const tooltipSentences = splitSentences(tooltipText);

  if (
    tooltipSentences[0] &&
    stripTrailingPeriod(tooltipSentences[0]).toLowerCase() ===
      power.name.toLowerCase()
  ) {
    tooltipSentences.shift();
  }

  const remainingText = tooltipSentences.join(" ");
  const activationTime = formatSeconds(power.activation_time);
  const maxDuration = formatSeconds(power.max_duration);
  const tickRate = formatSeconds(power.tick_rate);
  const cost = formatPowerCost(power.cost);
  const cooldown = formatSeconds(power.cooldown);
  const maxDurationLabel = isChargeActivationType(power.activation_type)
    ? "Charge time"
    : "Duration";
  const metrics = [
    activationTime ? `Activation ${activationTime}` : null,
    maxDuration ? `${maxDurationLabel} ${maxDuration}` : null,
    tickRate ? `Tick every ${tickRate}` : null,
    cost,
    cooldown ? `Cooldown ${cooldown}` : null,
  ].filter((value): value is string => Boolean(value));
  const rangeTags = (power.range_tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean);
  const tags = getTooltipTagBadges(power)
    .map((tag) => ({
      ...tag,
      label: formatTooltipLabel(tag.label) ?? "",
    }))
    .filter((tag) => Boolean(tag.label));
  const parentPowers = getParentPowerNames(power, powersById);
  const damageMods = getDamageModNames(
    power,
    powersById,
    damageModsByFramework,
  );
  const sources = splitSourceValues(power.source);

  return {
    title: formatTitle(power),
    framework: formatTooltipLabel(power.framework_id),
    tier: formatHeaderMeta(power),
    powerType: formatTooltipLabel(getPowerType(power)),
    activationType: formatTooltipLabel(power.activation_type),
    metrics,
    rangeTags,
    tags,
    effects: splitEffects(remainingText),
    damageMods,
    parentPowers,
    sources,
    advantages: getAdvantageTooltipData(power, advantagesById),
    fallbackText: tooltipText || null,
  };
}

export function getPowerTooltipAttribute(
  power: Power | null | undefined,
  advantagesById?: ReadonlyMap<number, Advantage> | null,
  powersById?: ReadonlyMap<number, Power> | null,
  damageModsByFramework?: ReadonlyMap<string, string> | null,
) {
  const tooltip = getPowerTooltipData(
    power,
    advantagesById,
    powersById,
    damageModsByFramework,
  );

  return tooltip ? JSON.stringify(tooltip) : undefined;
}
