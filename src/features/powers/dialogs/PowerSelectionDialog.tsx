import { useMemo, useState, type MouseEvent } from "react";
import type { BuildSlot } from "@/types/builds";
import type { Power } from "@/types/powers";
import { arrangeItemsByColumns } from "@/shared/utils/gridLayout";
import { getFrameworkIconName, getPowerIconName } from "@/shared/utils/icons";
import { getPowerTooltipText } from "@/shared/utils/powerText";
import { getPowerTooltipAttribute } from "@/shared/utils/powerTooltip";
import {
  getPowerDisplayFrameworkId,
  getPowerFrameworkSortIndex,
  getSelectablePowerFrameworkGroups,
  isPowerVisibleInFramework,
} from "@/utils/powerFrameworks";
import { getFrameworkGlossaryTooltipAttribute } from "@/utils/frameworkGlossary";
import { AnchoredSelectionDialog, type DialogAnchor } from "@/shared/ui";
import { SpriteIcon } from "@/shared/ui/SpriteIcon";

type PowerSelectionDialogProps = {
  anchor: DialogAnchor;
  buildSlots: BuildSlot[];
  buildSlot: BuildSlot;
  initialFrameworkId: string | null;
  powers: Power[];
  canSelectPower: (power: Power) => boolean;
  onClearPower: (slotNumber: number) => void;
  onClose: () => void;
  onSelectFramework: (frameworkId: string) => void;
  onSelectPower: (
    slotNumber: number,
    power: Power,
    displayFrameworkId: string | null,
    bypassSlotRules?: boolean,
  ) => void;
};

const tierOrder: Power["tier"][] = [-1, 0, 1, 2, 3, 4, null];

function getTierSortIndex(tier: Power["tier"]) {
  return tierOrder.indexOf(tier);
}

function getGroupPowers(powers: Power[], frameworkIds: string[]) {
  const uniquePowers = new Map<number, Power>();

  powers.forEach((power) => {
    if (
      frameworkIds.some((frameworkId) =>
        isPowerVisibleInFramework(power, frameworkId),
      )
    ) {
      uniquePowers.set(power.power_id, power);
    }
  });

  return Array.from(uniquePowers.values()).sort((a, b) => {
    const tierDifference =
      getTierSortIndex(a.tier) - getTierSortIndex(b.tier);
    const frameworkDifference =
      getPowerFrameworkSortIndex(a.framework_id) -
      getPowerFrameworkSortIndex(b.framework_id);

    return tierDifference || frameworkDifference || a.name.localeCompare(b.name);
  });
}

function getFrameworkTitle(
  frameworkGroups: ReturnType<typeof getSelectablePowerFrameworkGroups>,
  frameworkId: string | null,
) {
  if (frameworkId === null) {
    return "";
  }

  return (
    frameworkGroups
      .flatMap((frameworkGroup) => frameworkGroup.filters)
      .find((framework) => framework.id === frameworkId)?.title ?? frameworkId
  );
}

function getFrameworkIds(
  frameworkGroups: ReturnType<typeof getSelectablePowerFrameworkGroups>,
) {
  return frameworkGroups.flatMap((frameworkGroup) =>
    frameworkGroup.filters.map((framework) => framework.id),
  );
}

function resolveInitialFrameworkId(
  frameworkGroups: ReturnType<typeof getSelectablePowerFrameworkGroups>,
  preferredFrameworkId: string | null,
) {
  const frameworkIds = getFrameworkIds(frameworkGroups);

  return (
    frameworkIds.find((frameworkId) => frameworkId === preferredFrameworkId) ??
    frameworkIds.find((frameworkId) => frameworkId === "Electricity") ??
    frameworkIds[0] ??
    null
  );
}

export function PowerSelectionDialog({
  anchor,
  buildSlots,
  buildSlot,
  initialFrameworkId,
  powers,
  canSelectPower,
  onClearPower,
  onClose,
  onSelectFramework,
  onSelectPower,
}: PowerSelectionDialogProps) {
  const powersById = useMemo(() => {
    return new Map(powers.map((power) => [power.power_id, power]));
  }, [powers]);
  const frameworkGroups = getSelectablePowerFrameworkGroups(powers);
  const preferredFrameworkId = buildSlot.power
    ? buildSlot.displayFrameworkId ?? getPowerDisplayFrameworkId(buildSlot.power)
    : initialFrameworkId;
  const [selectedFramework, setSelectedFramework] = useState<string | null>(
    resolveInitialFrameworkId(frameworkGroups, preferredFrameworkId),
  );
  const selectedFrameworkTitle = getFrameworkTitle(
    frameworkGroups,
    selectedFramework,
  );
  const selectedPowerIds = new Set(
    buildSlots
      .filter((slot) => slot.slot !== buildSlot.slot)
      .map((slot) => slot.power?.power_id)
      .filter((powerId) => powerId !== undefined),
  );

  return (
    <AnchoredSelectionDialog
      anchor={anchor}
      ariaLabel="Select power"
      className="power-selection-dialog"
      closeAriaLabel="Close power selection"
      menuChildren={
        <>
          <button
            className="tab-button"
            type="button"
            onClick={() => onClearPower(buildSlot.slot)}
          >
            Clear
          </button>
          <span className="power-selection-dialog__framework-title">
            {selectedFrameworkTitle}
          </span>
        </>
      }
      onClose={onClose}
    >
      <div
        className="power-selection-framework-strip"
        aria-label="Power frameworks"
      >
        {frameworkGroups.map((frameworkGroup) => (
          <div className="framework-group" key={frameworkGroup.id}>
            {frameworkGroup.filters.map((framework) => (
              <button
                className={
                  selectedFramework === framework.id
                    ? "framework-button framework-button--active"
                    : "framework-button"
                }
                key={framework.id}
                type="button"
                onClick={() => {
                  setSelectedFramework(framework.id);
                  onSelectFramework(framework.id);
                }}
                data-framework-tooltip={getFrameworkGlossaryTooltipAttribute(
                  framework.id,
                  framework.title,
                )}
                title={framework.title}
              >
                <SpriteIcon
                  name={framework.iconId ?? getFrameworkIconName(framework.id)}
                  size={24}
                />
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="power-selection-list">
        {frameworkGroups.map((frameworkGroup) => {
          const activeFrameworkIds =
            selectedFramework === null
              ? frameworkGroup.filters.map((framework) => framework.id)
              : frameworkGroup.filters
                    .filter((framework) => framework.id === selectedFramework)
                    .map((framework) => framework.id);

          if (activeFrameworkIds.length === 0) {
            return null;
          }

          const groupPowers = getGroupPowers(
            powers,
            activeFrameworkIds,
          );

          if (groupPowers.length === 0) {
            return null;
          }

          return (
            <section className="power-selection-group" key={frameworkGroup.id}>
              <div className="power-selection-grid">
                {arrangeItemsByColumns(groupPowers, 2).map((power) => {
                  const isCurrent =
                    buildSlot.power?.power_id === power.power_id;
                  const isTaken = selectedPowerIds.has(power.power_id);
                  const canSelect = isCurrent || canSelectPower(power);

                  return (
                    <button
                      className={
                        [
                          "power-selection-choice",
                          isCurrent ? "power-selection-choice--current" : "",
                          isTaken ? "power-selection-choice--taken" : "",
                          !canSelect ? "power-selection-choice--disabled" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")
                      }
                      aria-disabled={!canSelect}
                      key={power.power_id}
                      type="button"
                      onClick={(event: MouseEvent<HTMLButtonElement>) => {
                        const bypassSlotRules =
                          event.ctrlKey && event.shiftKey;

                        if (!canSelect && !bypassSlotRules) {
                          event.preventDefault();
                          return;
                        }

                        onSelectPower(
                          buildSlot.slot,
                          power,
                          getPowerDisplayFrameworkId(power, selectedFramework),
                          bypassSlotRules,
                        );
                      }}
                    >
                      <SpriteIcon name={getPowerIconName(power)} size={22} />
                      <span
                        className="power-selection-choice__label"
                        data-power-tooltip={getPowerTooltipAttribute(
                          power,
                          undefined,
                          powersById,
                        )}
                        title={getPowerTooltipText(power)}
                      >
                        {power.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </AnchoredSelectionDialog>
  );
}
