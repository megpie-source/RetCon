import type { SuperStat } from "@/types/character";
import type { GearBonus, GearBuildSlot, GearItem } from "@/types/gear";
import {
  formatBonusType,
  getGearBonusValue,
  getRankedGearBonusValue,
  getResolvedBonusTypes,
  statBonusOrderIndex,
} from "./gearBonusFormatting";
import {
  getBonusSignature,
  getOverriddenSetBonusPieces,
  getSetPieceBonusTiers,
} from "./gearSetBonuses";

function addBonusToTotals(
  totals: Map<string, number>,
  type: string,
  value: number | null,
) {
  if (value === null || !Number.isFinite(value)) {
    return;
  }

  const normalizedType = type.trim();

  totals.set(normalizedType, (totals.get(normalizedType) ?? 0) + value);
}

function addResolvedBonusToTotals(
  totals: Map<string, number>,
  bonus: GearBonus,
  value: number | null,
  selectedSuperStats: (SuperStat | null)[],
) {
  getResolvedBonusTypes(bonus.type, selectedSuperStats).forEach((type) => {
    addBonusToTotals(totals, type, value);
  });
}

function normalizeTotalType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/gu, "_");
}

function isDamageBonusTotal(type: string) {
  const normalizedType = normalizeTotalType(type);

  return (
    normalizedType === "damage_bonus" ||
    normalizedType === "bonus_damage" ||
    normalizedType.startsWith("damage_bonus_") ||
    (normalizedType.startsWith("bonus_") && normalizedType.endsWith("_damage"))
  );
}

function isArmorPenetrationTotal(type: string) {
  const normalizedType = normalizeTotalType(type);

  return (
    normalizedType === "armor_penetration" ||
    normalizedType.startsWith("armor_penetration_")
  );
}

function isThreatTotal(type: string) {
  const normalizedType = normalizeTotalType(type);

  return normalizedType === "threat" || normalizedType.startsWith("threat_");
}

function isDodgeAvoidanceTotal(type: string) {
  const normalizedType = normalizeTotalType(type);

  return normalizedType === "dodge_chance" || normalizedType === "avoidance";
}

function isCriticalTotal(type: string) {
  const normalizedType = normalizeTotalType(type);

  return (
    normalizedType === "critical_strike" ||
    normalizedType === "critical_severity"
  );
}

function isResistanceTotal(type: string) {
  const normalizedType = normalizeTotalType(type);

  return (
    normalizedType === "resistance" ||
    normalizedType.endsWith("_resistance") ||
    normalizedType === "flat_damage_reduction"
  );
}

function isMaxResourceTotal(type: string) {
  const normalizedType = normalizeTotalType(type);

  return normalizedType === "max_hp" || normalizedType === "max_energy";
}

function isCostCooldownTotal(type: string) {
  const normalizedType = normalizeTotalType(type);

  return (
    normalizedType === "cost_discount" ||
    normalizedType === "cooldown_reduction"
  );
}

function getTotalSortBucket(type: string) {
  const normalizedType = normalizeTotalType(type);

  if (normalizedType === "defense") {
    return 10;
  }

  if (isResistanceTotal(type)) {
    return 20;
  }

  if (normalizedType === "offense") {
    return 30;
  }

  if (isDamageBonusTotal(type)) {
    return 40;
  }

  if (isArmorPenetrationTotal(type)) {
    return 45;
  }

  if (isThreatTotal(type)) {
    return 50;
  }

  if (isDodgeAvoidanceTotal(type)) {
    return 60;
  }

  if (isCriticalTotal(type)) {
    return 70;
  }

  if (isMaxResourceTotal(type)) {
    return 80;
  }

  if (isCostCooldownTotal(type)) {
    return 90;
  }

  return 100;
}

function getDamageBonusSortRank(type: string) {
  const normalizedType = normalizeTotalType(type);

  if (normalizedType === "damage_bonus" || normalizedType === "bonus_damage") {
    return 0;
  }

  if (normalizedType === "bonus_melee_damage") {
    return 1;
  }

  if (normalizedType === "bonus_ranged_damage") {
    return 2;
  }

  return 10;
}

function getArmorPenetrationSortRank(type: string) {
  const normalizedType = normalizeTotalType(type);

  return normalizedType === "armor_penetration" ? 0 : 10;
}

function getThreatSortRank(type: string) {
  const normalizedType = normalizeTotalType(type);

  return normalizedType === "threat" ? 0 : 10;
}

function getDodgeAvoidanceSortRank(type: string) {
  const normalizedType = normalizeTotalType(type);

  return normalizedType === "dodge_chance" ? 0 : 1;
}

function getCriticalSortRank(type: string) {
  const normalizedType = normalizeTotalType(type);

  return normalizedType === "critical_strike" ? 0 : 1;
}

function getResistanceSortRank(type: string) {
  const normalizedType = normalizeTotalType(type);

  if (normalizedType === "resistance") {
    return 0;
  }

  if (normalizedType === "flat_damage_reduction") {
    return 1;
  }

  return 10;
}

function getMaxResourceSortRank(type: string) {
  const normalizedType = normalizeTotalType(type);

  return normalizedType === "max_hp" ? 0 : 1;
}

function getCostCooldownSortRank(type: string) {
  const normalizedType = normalizeTotalType(type);

  return normalizedType === "cost_discount" ? 0 : 1;
}

function getSelectedGearBySet(gearSlots: GearBuildSlot[]) {
  const gearBySet = new Map<string, GearItem[]>();

  gearSlots.forEach((gearSlot) => {
    const gear = gearSlot.gear;

    if (!gear?.gear_set) {
      return;
    }

    gearBySet.set(gear.gear_set, [
      ...(gearBySet.get(gear.gear_set) ?? []),
      gear,
    ]);
  });

  return gearBySet;
}

function addCommonSetBonusesToTotals(
  totals: Map<string, number>,
  setGears: GearItem[],
  selectedSuperStats: (SuperStat | null)[],
) {
  const setGearCount = setGears.length;
  const overriddenSetBonusPieces = getOverriddenSetBonusPieces(setGears);
  const bonusHits = new Map<string, { bonus: GearBonus; gearIds: Set<number> }>();

  setGears.forEach((gear) => {
    gear.set_bonuses.forEach((setBonusTier) => {
      if (
        setBonusTier.pieces > setGearCount ||
        overriddenSetBonusPieces.has(setBonusTier.pieces)
      ) {
        return;
      }

      setBonusTier.bonuses.forEach((bonus) => {
        const signature = getBonusSignature(bonus);
        const hit = bonusHits.get(signature) ?? {
          bonus,
          gearIds: new Set<number>(),
        };

        hit.gearIds.add(gear.gear_id);
        bonusHits.set(signature, hit);
      });
    });
  });

  bonusHits.forEach(({ bonus, gearIds }) => {
    if (gearIds.size !== setGearCount) {
      return;
    }

    addResolvedBonusToTotals(
      totals,
      bonus,
      getGearBonusValue(bonus),
      selectedSuperStats,
    );
  });
}

function addSetPieceBonusesToTotals(
  totals: Map<string, number>,
  setGears: GearItem[],
  selectedSuperStats: (SuperStat | null)[],
) {
  const setGearCount = setGears.length;

  setGears.forEach((gear) => {
    getSetPieceBonusTiers(gear).forEach((setPieceBonusTier) => {
      if (setPieceBonusTier.pieces > setGearCount) {
        return;
      }

      setPieceBonusTier.bonuses.forEach((bonus) => {
        addResolvedBonusToTotals(
          totals,
          bonus,
          getGearBonusValue(bonus),
          selectedSuperStats,
        );
      });
    });
  });
}

export function getGearTotals(
  gearSlots: GearBuildSlot[],
  selectedSuperStats: (SuperStat | null)[],
) {
  const totals = new Map<string, number>();

  gearSlots.forEach((gearSlot) => {
    gearSlot.gear?.bonuses.forEach((bonus) => {
      addResolvedBonusToTotals(
        totals,
        bonus,
        getGearBonusValue(bonus),
        selectedSuperStats,
      );
    });

    gearSlot.selectedMods.forEach((selectedMod) => {
      if (!selectedMod?.rank) {
        return;
      }

      const selectedRank = selectedMod.rank;

      selectedMod.mod.bonuses.forEach((bonus) => {
        addResolvedBonusToTotals(
          totals,
          bonus,
          getRankedGearBonusValue(bonus, selectedRank),
          selectedSuperStats,
        );
      });
    });
  });

  getSelectedGearBySet(gearSlots).forEach((setGears) => {
    addCommonSetBonusesToTotals(totals, setGears, selectedSuperStats);
    addSetPieceBonusesToTotals(totals, setGears, selectedSuperStats);
  });

  return Array.from(totals.entries()).sort(([typeA], [typeB]) => {
    const statIndexA = statBonusOrderIndex.get(typeA.toUpperCase());
    const statIndexB = statBonusOrderIndex.get(typeB.toUpperCase());

    if (statIndexA !== undefined || statIndexB !== undefined) {
      return (statIndexA ?? 999) - (statIndexB ?? 999);
    }

    const sortBucketDifference =
      getTotalSortBucket(typeA) - getTotalSortBucket(typeB);

    if (sortBucketDifference !== 0) {
      return sortBucketDifference;
    }

    if (isResistanceTotal(typeA) && isResistanceTotal(typeB)) {
      const resistanceSortDifference =
        getResistanceSortRank(typeA) - getResistanceSortRank(typeB);

      if (resistanceSortDifference !== 0) {
        return resistanceSortDifference;
      }
    }

    if (isDamageBonusTotal(typeA) && isDamageBonusTotal(typeB)) {
      const damageSortDifference =
        getDamageBonusSortRank(typeA) - getDamageBonusSortRank(typeB);

      if (damageSortDifference !== 0) {
        return damageSortDifference;
      }
    }

    if (
      isArmorPenetrationTotal(typeA) &&
      isArmorPenetrationTotal(typeB)
    ) {
      const armorPenetrationSortDifference =
        getArmorPenetrationSortRank(typeA) -
        getArmorPenetrationSortRank(typeB);

      if (armorPenetrationSortDifference !== 0) {
        return armorPenetrationSortDifference;
      }
    }

    if (isThreatTotal(typeA) && isThreatTotal(typeB)) {
      const threatSortDifference =
        getThreatSortRank(typeA) - getThreatSortRank(typeB);

      if (threatSortDifference !== 0) {
        return threatSortDifference;
      }
    }

    if (isDodgeAvoidanceTotal(typeA) && isDodgeAvoidanceTotal(typeB)) {
      return getDodgeAvoidanceSortRank(typeA) - getDodgeAvoidanceSortRank(typeB);
    }

    if (isCriticalTotal(typeA) && isCriticalTotal(typeB)) {
      return getCriticalSortRank(typeA) - getCriticalSortRank(typeB);
    }

    if (isMaxResourceTotal(typeA) && isMaxResourceTotal(typeB)) {
      return getMaxResourceSortRank(typeA) - getMaxResourceSortRank(typeB);
    }

    if (isCostCooldownTotal(typeA) && isCostCooldownTotal(typeB)) {
      return getCostCooldownSortRank(typeA) - getCostCooldownSortRank(typeB);
    }

    return formatBonusType(typeA).localeCompare(formatBonusType(typeB));
  });
}
