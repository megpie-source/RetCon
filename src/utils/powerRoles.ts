import type { Power } from "@/types/powers";
import type { Advantage } from "@/types/advantages";
import { getNormalizedPowerType } from "@/shared/utils/powerTypes";
import { getSearchTags } from "./powerTags";

const powerTypeRoleRules: Array<[string, string[]]> = [
  ["ACTIVE_DEFENSE", ["Active Defense"]],
  ["ACTIVE_OFFENSE", ["Active Offense"]],
  ["ACTIVE_POWERS", ["Active Offense", "Active Defense"]],
  ["ALLY_HEAL", []],
  ["BLOCK", ["Block"]],
  ["BUFF_SELF", ["Buff / Debuff"]],
  ["BUFF_TARGETS", ["Buff / Debuff"]],
  ["CIRCLE", ["Buff / Debuff"]],
  ["CONTROLLABLE_PET", ["Pet"]],
  ["CROWD_CONTROL", ["Crowd Control"]],
  ["DEBUFF", ["Buff / Debuff"]],
  ["DEVICE", ["Device"]],
  ["ENERGY_BUILDER", ["Energy Builder"]],
  ["ENERGY_UNLOCK", ["Energy Unlock"]],
  ["HEAL", []],
  ["HEAL_OVER_TIME", []],
  ["LUNGE", ["Lunge"]],
  ["MELEE_RANGED", ["Melee Damage", "Ranged Damage"]],
  ["MELEE_AOE_DAMAGE", ["Melee Damage"]],
  ["MELEE_DAMAGE", ["Melee Damage"]],
  ["ON_NEXT_HIT", ["Buff / Debuff"]],
  ["RANGED_AOE_DAMAGE", ["Ranged Damage"]],
  ["RANGED_DAMAGE", ["Ranged Damage"]],
  ["REVERSE_LUNGE", ["Lunge"]],
  ["REVIVE", ["Revive / Self-Rez"]],
  ["SELF_HEAL", []],
  ["SELF_HEAL_OVER_TIME", []],
  ["SELF_RESURRECTION", ["Revive / Self-Rez"]],
  ["SHIELD", []],
  ["SLOTTED_DEFENSIVE_PASSIVE", ["Slotted Passive"]],
  ["SLOTTED_HYBRID_PASSIVE", ["Slotted Passive"]],
  ["SLOTTED_OFFENSIVE_PASSIVE", ["Slotted Passive"]],
  ["SLOTTED_SUPPORT_PASSIVE", ["Slotted Passive"]],
  ["TEAM_HEAL", []],
  ["THREAT_WIPE", ["Threat Wipe"]],
  ["TOGGLE_FORM", ["Toggle Form"]],
  ["TRAVEL_POWER", ["Travel Power"]],
  ["UNCONTROLED_PET", ["Pet"]],
];

const powerTypeRoleMap = new Map(powerTypeRoleRules);
const crowdControlTags = new Set([
  "confuse",
  "incapacitate",
  "paralyze",
  "root",
  "sleep",
  "stun",
]);
const buffDebuffTags = new Set(["static field"]);
const activeHealShieldTags = new Set(["active heal", "life drain", "team heal"]);
const passiveHealShieldTags = new Set(["passive heal"]);
const shieldApplyTags = new Set(["direct shield", "shield", "shield special"]);
const powerRoleOrder = [
  "Ranged Damage",
  "Melee Damage",
  "Active Heal",
  "Passive Heal",
  "Shield",
  "Slotted Passive",
  "Toggle Form",
  "Block",
  "Energy Unlock",
  "Active Defense",
  "Active Offense",
  "Revive / Self-Rez",
  "Buff / Debuff",
  "Crowd Control",
  "Lunge",
  "Pet",
  "Threat Wipe",
];
const powerRoleAdvantageHighlightQueries: Record<string, string[]> = {
  "Active Heal": [...activeHealShieldTags],
  "Buff / Debuff": [...buffDebuffTags],
  "Crowd Control": [...crowdControlTags],
  "Passive Heal": [...passiveHealShieldTags],
  Shield: ["Direct Shield", "Shield", "Shield (special)"],
};

type PowerRoleContext = {
  advantagesById?: ReadonlyMap<number, Advantage> | null;
  includeAdvantageTags?: boolean;
  includePowerMetadata?: boolean;
  includePowerTags?: boolean;
};

function normalizeRuleText(value: string | null | undefined) {
  return value?.replace(/[^a-z0-9]+/giu, " ").trim().toLowerCase() ?? "";
}

function hasAnyNormalizedValue(
  values: string[] | null | undefined,
  expectedValues: ReadonlySet<string>,
) {
  return (values ?? []).some((value) =>
    expectedValues.has(normalizeRuleText(value)),
  );
}

function hasLungeRangeTag(power: Power) {
  return (power.range_tags ?? []).some((rangeTag) =>
    normalizeRuleText(rangeTag).includes("lunge"),
  );
}

function hasActiveHealShieldTag(tags: string[] | null | undefined) {
  return hasAnyNormalizedValue(tags, activeHealShieldTags);
}

function hasPassiveHealShieldTag(tags: string[] | null | undefined) {
  return hasAnyNormalizedValue(tags, passiveHealShieldTags);
}

function getTagValues(value: string[] | string | null | undefined) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((tag) => String(tag).split(";"))
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getAdvantageTags(
  power: Power,
  advantagesById: ReadonlyMap<number, Advantage> | null | undefined,
) {
  if (!advantagesById) {
    return [];
  }

  return power.advantages.flatMap((advantageId) => {
    const advantage = advantagesById.get(advantageId);

    return advantage ? getSearchTags(advantage) : [];
  });
}

function getAdvantageApplyTags(
  power: Power,
  advantagesById: ReadonlyMap<number, Advantage> | null | undefined,
) {
  if (!advantagesById) {
    return [];
  }

  return power.advantages.flatMap((advantageId) => {
    const advantage = advantagesById.get(advantageId);

    return advantage ? getTagValues(advantage.apply_tag) : [];
  });
}

export function getPowerRoles(power: Power, context: PowerRoleContext = {}) {
  const roles = new Set<string>();
  const normalizedPowerType = getNormalizedPowerType(power);
  const includePowerMetadata = context.includePowerMetadata ?? true;
  const includePowerTags = context.includePowerTags ?? true;
  const includeAdvantageTags = context.includeAdvantageTags ?? false;

  if (includePowerMetadata) {
    powerTypeRoleMap.get(normalizedPowerType)?.forEach((role) => roles.add(role));
  }

  const powerTags = getSearchTags(power);
  const powerApplyTags = getTagValues(power.apply_tag);
  const advantageTags = getAdvantageTags(power, context.advantagesById);
  const advantageApplyTags = getAdvantageApplyTags(
    power,
    context.advantagesById,
  );

  if (includePowerTags && hasAnyNormalizedValue(powerTags, crowdControlTags)) {
    roles.add("Crowd Control");
  }

  if (includePowerTags && hasAnyNormalizedValue(powerTags, buffDebuffTags)) {
    roles.add("Buff / Debuff");
  }

  if (includePowerTags && hasActiveHealShieldTag(powerTags)) {
    roles.add("Active Heal");
  }

  if (includePowerTags && hasPassiveHealShieldTag(powerTags)) {
    roles.add("Passive Heal");
  }

  if (includePowerTags && hasAnyNormalizedValue(powerApplyTags, shieldApplyTags)) {
    roles.add("Shield");
  }

  if (
    includeAdvantageTags &&
    hasAnyNormalizedValue(advantageTags, buffDebuffTags)
  ) {
    roles.add("Buff / Debuff");
  }

  if (
    includeAdvantageTags &&
    hasActiveHealShieldTag(advantageTags)
  ) {
    roles.add("Active Heal");
  }

  if (
    includeAdvantageTags &&
    hasPassiveHealShieldTag(advantageTags)
  ) {
    roles.add("Passive Heal");
  }

  if (
    includeAdvantageTags &&
    hasAnyNormalizedValue(advantageApplyTags, shieldApplyTags)
  ) {
    roles.add("Shield");
  }

  if (includePowerMetadata && hasLungeRangeTag(power)) {
    roles.add("Lunge");
  }

  return powerRoleOrder.filter((role) => roles.has(role));
}

export function getPowerRoleOptions(
  powers: Power[],
  advantagesById?: ReadonlyMap<number, Advantage> | null,
) {
  const availableRoles = new Set(
    powers.flatMap((power) =>
      getPowerRoles(power, {
        advantagesById,
        includeAdvantageTags: true,
      }),
    ),
  );

  return powerRoleOrder
    .filter((role) => availableRoles.has(role))
    .map((role) => ({
      label: role,
      value: role,
    }));
}

export function getPowerRoleAdvantageHighlightQueries(role: string) {
  return powerRoleAdvantageHighlightQueries[role] ?? [];
}
