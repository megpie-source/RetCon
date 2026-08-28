import {
  initialArchetypeBuildSlots,
  initialBuildSlots,
} from "@/constants/buildSlots";
import type { BuildSlot } from "@/types/builds";
import type { Archetype } from "@/types/character";
import type { Power } from "@/types/powers";
import { clearBuildSlot } from "./buildSlots";
import { getPowerDisplayFrameworkId } from "./powerFrameworks";
import { canSelectPower, isPowerEnabled } from "./powerrules";

export function getPowerPlacementPreview(
  power: Power,
  displayFrameworkId: string | null | undefined,
  targetSlot: BuildSlot,
  currentBuildSlots: BuildSlot[],
) {
  const sourceSlot =
    currentBuildSlots.find(
      (slot) => slot.power?.power_id === power.power_id,
    ) ?? null;

  if (sourceSlot?.slot === targetSlot.slot) {
    return currentBuildSlots;
  }

  return currentBuildSlots.map((slot) => {
    if (slot.slot === targetSlot.slot) {
      return {
        ...slot,
        power,
        displayFrameworkId:
          displayFrameworkId ?? getPowerDisplayFrameworkId(power),
        selectedAdvantages: sourceSlot?.selectedAdvantages ?? [],
      };
    }

    if (sourceSlot && slot.slot === sourceSlot.slot) {
      if (targetSlot.power) {
        return {
          ...slot,
          power: targetSlot.power,
          displayFrameworkId: targetSlot.displayFrameworkId,
          selectedAdvantages: targetSlot.selectedAdvantages,
        };
      }

      return clearBuildSlot(slot);
    }

    return slot;
  });
}

export function getTravelPowerPlacementPreview(
  power: Power,
  targetSlot: BuildSlot,
  currentTravelPowerSlots: BuildSlot[],
) {
  const sourceSlot =
    currentTravelPowerSlots.find(
      (slot) => slot.power?.power_id === power.power_id,
    ) ?? null;

  if (sourceSlot?.slot === targetSlot.slot) {
    return currentTravelPowerSlots;
  }

  return currentTravelPowerSlots.map((slot) => {
    if (slot.slot === targetSlot.slot) {
      return {
        ...slot,
        power,
        displayFrameworkId: getPowerDisplayFrameworkId(power),
        selectedAdvantages: sourceSlot?.selectedAdvantages ?? [],
      };
    }

    if (sourceSlot && slot.slot === sourceSlot.slot) {
      if (targetSlot.power) {
        return {
          ...slot,
          power: targetSlot.power,
          displayFrameworkId: targetSlot.displayFrameworkId,
          selectedAdvantages: targetSlot.selectedAdvantages,
        };
      }

      return clearBuildSlot(slot);
    }

    return slot;
  });
}

export function getPowerVariantPlacementPreview(
  power: Power,
  targetSlot: BuildSlot,
  currentPowerVariantSlots: BuildSlot[],
) {
  const sourceSlot =
    currentPowerVariantSlots.find(
      (slot) => slot.power?.power_id === power.power_id,
    ) ?? null;

  if (sourceSlot?.slot === targetSlot.slot) {
    return currentPowerVariantSlots;
  }

  return currentPowerVariantSlots.map((slot) => {
    if (slot.slot === targetSlot.slot) {
      return {
        ...slot,
        power,
        displayFrameworkId: getPowerDisplayFrameworkId(power),
        selectedAdvantages: [],
      };
    }

    if (sourceSlot && slot.slot === sourceSlot.slot) {
      if (targetSlot.power) {
        return {
          ...slot,
          power: targetSlot.power,
          displayFrameworkId: targetSlot.displayFrameworkId,
          selectedAdvantages: [],
        };
      }

      return clearBuildSlot(slot);
    }

    return slot;
  });
}

export function getDevicePlacementPreview(
  power: Power,
  targetSlot: BuildSlot,
  currentDeviceSlots: BuildSlot[],
) {
  return currentDeviceSlots.map((slot) =>
    slot.slot === targetSlot.slot
      ? {
          ...slot,
          power,
          displayFrameworkId: getPowerDisplayFrameworkId(power),
          selectedAdvantages: [],
        }
      : slot,
  );
}

export function canPlacePowerInSlot(
  power: Power,
  targetSlot: BuildSlot,
  currentBuildSlots: BuildSlot[],
) {
  const sourceSlot =
    currentBuildSlots.find(
      (slot) => slot.power?.power_id === power.power_id,
    ) ?? null;
  const previewSlots = getPowerPlacementPreview(
    power,
    null,
    targetSlot,
    currentBuildSlots,
  );

  if (sourceSlot?.slot === targetSlot.slot) {
    return true;
  }

  if (!canSelectPower(power, previewSlots, targetSlot.slot)) {
    return false;
  }

  return true;
}

export function getFirstValidPowerSlot(
  power: Power,
  currentBuildSlots: BuildSlot[],
) {
  return (
    currentBuildSlots.find(
      (slot) =>
        slot.power === null &&
        canPlacePowerInSlot(power, slot, currentBuildSlots),
    ) ?? null
  );
}

export function createArchetypeBuildSlots(
  archetype: Archetype,
  currentBuildSlots: BuildSlot[],
  powersById: Map<number, Power>,
) {
  return initialArchetypeBuildSlots.map((slot, index) => {
    const archetypeEntry = archetype.powerList?.[index];
    const allowedPowerIds = Array.isArray(archetypeEntry)
      ? archetypeEntry
      : archetypeEntry === undefined
        ? []
        : [archetypeEntry];
    const currentSlot = currentBuildSlots.find(
      (candidateSlot) => candidateSlot.slot === slot.slot,
    );
    const selectedPowerId =
      currentSlot?.power &&
      isPowerEnabled(currentSlot.power) &&
      allowedPowerIds.includes(currentSlot.power.power_id)
        ? currentSlot.power.power_id
        : allowedPowerIds.find((powerId) =>
            isPowerEnabled(powersById.get(powerId)),
          );
    const power =
      selectedPowerId === undefined ? null : powersById.get(selectedPowerId) ?? null;

    return {
      ...slot,
      power,
      displayFrameworkId: power ? getPowerDisplayFrameworkId(power) : null,
      selectedAdvantages:
        currentSlot && currentSlot.power?.power_id === power?.power_id
          ? currentSlot.selectedAdvantages
          : [],
    };
  });
}

export function createFreeformBuildSlots(currentBuildSlots: BuildSlot[]) {
  return initialBuildSlots.map((slot) => {
    const currentSlot = currentBuildSlots.find(
      (candidateSlot) => candidateSlot.slot === slot.slot,
    );

    return currentSlot
      ? {
          ...slot,
          power: currentSlot.power,
          displayFrameworkId: currentSlot.displayFrameworkId,
          selectedAdvantages: currentSlot.selectedAdvantages,
        }
      : slot;
  });
}
