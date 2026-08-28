import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { Advantage } from "@/types/advantages";
import type { BuildSlot } from "@/types/builds";
import type { Archetype, ArchetypeGroup } from "@/types/character";
import type { Power } from "@/types/powers";
import type { DialogAnchor } from "@/shared/ui/AnchoredDialog";
import { getPowerIconName } from "@/shared/utils/icons";
import { getPowerTooltipText } from "@/shared/utils/powerText";
import { getPowerTooltipAttribute } from "@/shared/utils/powerTooltip";
import {
  getPowerVariantDisplayAdvantages,
  hasPowerVariantParent,
} from "@/utils/powerVariantRules";
import { getPowerAdvantages } from "@/utils/powerAdvantages";
import { isEnergyUnlockPower } from "@/utils/powerrules";
import { SpriteIcon } from "@/shared/ui/SpriteIcon";

type BuildPanelProps = {
  buildSlots: BuildSlot[];
  travelPowerSlots: BuildSlot[];
  powerVariantSlots: BuildSlot[];
  powers: Power[];
  advantages: Advantage[];
  damageModsByFramework: ReadonlyMap<string, string>;
  advantagePointBudget: number;
  camsLevel: number;
  camsIconName: string;
  camsMenuOpen: boolean;
  totalAdvantagePoints: number;
  archetype: Archetype | null;
  role: ArchetypeGroup | null;
  roleLocked: boolean;
  onChangeCamsLevel: (delta: 1 | -1) => void;
  onSelectCamsIcon: (iconName: string) => void;
  onToggleCamsMenu: () => void;
  onSelectArchetype: (anchor: DialogAnchor) => void;
  onSelectRole: (anchor: DialogAnchor) => void;
  onSelectBuildSlot: (slotNumber: number) => void;
  onSelectTravelPowerSlot: (slotNumber: number) => void;
  onSelectTravelPowerName: (slotNumber: number, anchor: DialogAnchor) => void;
  onSelectPowerVariantSlot: (slotNumber: number) => void;
  onSelectPowerVariantName: (slotNumber: number, anchor: DialogAnchor) => void;
  onSelectAdvantageSlot: (slotNumber: number, anchor: DialogAnchor) => void;
  onSelectPowerSlot: (slotNumber: number, anchor: DialogAnchor) => void;
  onClearPowerSlot: (slotNumber: number) => void;
  onClearTravelPowerSlot: (slotNumber: number) => void;
  onClearPowerVariantSlot: (slotNumber: number) => void;
  onToggleCollapse: () => void;
  highlightedPowerTargetSlot: number | null;
  highlightedTravelPowerTargetSlot: number | null;
  highlightedPowerVariantTargetSlot: number | null;
  scrollTargetSlot: number | null;
  invalidPowerSlotNumbers: Set<number>;
  invalidPowerVariantSlotNumbers: Set<number>;
  lockedPowerSlotNumbers: Set<number>;
};

const camsIconOptions = [
  {
    iconName: "CAMS_Generic",
    label: "Any",
    tooltip: "Choose any CAMS",
  },
  {
    iconName: "CAMS_Green",
    label: "Green CAMS",
    tooltip: "Increases your maximum Health Points by 100/300/600/1200/2000 HP",
  },
  {
    iconName: "CAMS_blue",
    label: "Blue CAMS",
    tooltip:
      "Increases your maximum Energy by 5/15/30/50/75 Energy points.\nIncreases your Energy regeneration by 1/3/6/10/15 Energy per second",
  },
];

function formatAdvantageText(selectedAdvantages: Advantage[]) {
  if (selectedAdvantages.length === 0) {
    return "advantages";
  }

  return selectedAdvantages
    .map((advantage) =>
      advantage.name === "Accelerated Metabolism"
        ? "Acc. Metab."
        : advantage.name,
  )
    .join(", ");
}

function selectedAdvantageText(
  slot: BuildSlot,
  slotAdvantages: Advantage[],
) {
  return formatAdvantageText(
    slotAdvantages.filter((advantage) =>
      slot.selectedAdvantages.includes(advantage.advantage_id),
    ),
  );
}

export function BuildPanel({
  buildSlots,
  travelPowerSlots,
  powerVariantSlots,
  powers,
  advantages,
  damageModsByFramework,
  advantagePointBudget,
  camsLevel,
  camsIconName,
  camsMenuOpen,
  totalAdvantagePoints,
  archetype,
  role,
  roleLocked,
  onChangeCamsLevel,
  onSelectCamsIcon,
  onToggleCamsMenu,
  onSelectArchetype,
  onSelectRole,
  onSelectBuildSlot,
  onSelectTravelPowerSlot,
  onSelectTravelPowerName,
  onSelectPowerVariantSlot,
  onSelectPowerVariantName,
  onSelectAdvantageSlot,
  onSelectPowerSlot,
  onClearPowerSlot,
  onClearTravelPowerSlot,
  onClearPowerVariantSlot,
  onToggleCollapse,
  highlightedPowerTargetSlot,
  highlightedTravelPowerTargetSlot,
  highlightedPowerVariantTargetSlot,
  scrollTargetSlot,
  invalidPowerSlotNumbers,
  invalidPowerVariantSlotNumbers,
  lockedPowerSlotNumbers,
}: BuildPanelProps) {
  const advantageBudgetExceeded = totalAdvantagePoints > advantagePointBudget;
  const powersById = useMemo(() => {
    return new Map(powers.map((power) => [power.power_id, power]));
  }, [powers]);
  const [closedSections, setClosedSections] = useState<string[]>([]);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const slotElementsRef = useRef(new Map<number, HTMLDivElement>());

  function isClearSlotClick(event: MouseEvent) {
    const isAltGraphClick =
      event.getModifierState("AltGraph") || (event.altKey && event.ctrlKey);

    return (
      (event.altKey || isAltGraphClick) &&
      !event.metaKey &&
      !event.shiftKey &&
      (isAltGraphClick || !event.ctrlKey)
    );
  }

  function toggleSection(sectionKey: string) {
    setClosedSections((currentClosedSections) =>
      currentClosedSections.includes(sectionKey)
        ? currentClosedSections.filter((key) => key !== sectionKey)
        : [...currentClosedSections, sectionKey],
    );
  }

  function renderSectionToggle(sectionKey: string, label: string) {
    const isClosed = closedSections.includes(sectionKey);

    return (
      <button
        aria-expanded={!isClosed}
        className="power-tier__toggle"
        type="button"
        onClick={() => toggleSection(sectionKey)}
      >
        <span>{label}</span>
        <span
          className={
            isClosed
              ? "tier-toggle-icon tier-toggle-icon--closed"
              : "tier-toggle-icon"
          }
        />
      </button>
    );
  }

  useEffect(() => {
    if (scrollTargetSlot === null) {
      return;
    }

    const body = bodyRef.current;
    const target = slotElementsRef.current.get(scrollTargetSlot);

    if (!body || !target) {
      return;
    }

    const bodyRect = body.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const isHiddenAbove = targetRect.top < bodyRect.top;
    const isHiddenBelow = targetRect.bottom > bodyRect.bottom;

    if (isHiddenAbove || isHiddenBelow) {
      target.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [scrollTargetSlot]);

  return (
    <section className="panel build-panel">
      <div className="build-panel__header">
        <h2>
          <button
            className="panel-title-button"
            type="button"
            onClick={onToggleCollapse}
          >
            Build
          </button>
        </h2>
        <div className="build-panel__identity">
          <button
            className="archetype-badge"
            type="button"
            onClick={(event: MouseEvent<HTMLButtonElement>) =>
              onSelectArchetype({
                x: event.clientX,
                y: event.clientY,
              })
            }
          >
            <SpriteIcon name={archetype?.icon ?? "Archetype_Freeform"} size={30} />
            <strong>{archetype?.name ?? "Freeform"}</strong>
          </button>
          <button
            className={
              roleLocked ? "role-button role-button--locked" : "role-button"
            }
            disabled={roleLocked}
            title={role?.toolTip ?? role?.name ?? "Role"}
            type="button"
            onClick={(event: MouseEvent<HTMLButtonElement>) =>
              onSelectRole({
                x: event.clientX,
                y: event.clientY,
              })
            }
          >
            <SpriteIcon
              name={role?.icon ?? "Role_Freeform"}
              width={22.5}
              height={30}
            />
          </button>
        </div>
      </div>

      <div className="build-panel__body" ref={bodyRef}>
        <section className="power-tier build-section">
          {renderSectionToggle("powers", "Powers")}
          {!closedSections.includes("powers") ? (
            <div className="build-list">
              {buildSlots.map((slot) => {
                const slotAdvantages = slot.power
                  ? getPowerAdvantages(slot.power, advantages)
                  : [];
                const isPowerIllegal =
                  slot.power !== null && invalidPowerSlotNumbers.has(slot.slot);
                const isPowerLocked = lockedPowerSlotNumbers.has(slot.slot);

                return (
                  <div
                    className="build-entry"
                    key={slot.slot}
                    ref={(element) => {
                      if (element) {
                        slotElementsRef.current.set(slot.slot, element);
                      } else {
                        slotElementsRef.current.delete(slot.slot);
                      }
                    }}
                  >
                    <div
                      className={
                        [
                          "build-entry__summary",
                          slot.power ? "" : "build-entry__summary--empty",
                          isPowerIllegal ? "build-entry__summary--illegal" : "",
                          isPowerLocked ? "build-entry__summary--locked" : "",
                          highlightedPowerTargetSlot === slot.slot
                            ? "build-entry__summary--target"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")
                      }
                      onClick={(event: MouseEvent<HTMLDivElement>) => {
                        if (!isPowerLocked) {
                          if (slot.power && isClearSlotClick(event)) {
                            event.preventDefault();
                            onClearPowerSlot(slot.slot);
                            return;
                          }

                          onSelectBuildSlot(slot.slot);
                        }
                      }}
                    >
                      <div className="build-entry__power-main">
                        <span className="level-label">{slot.level}</span>
                        <SpriteIcon
                          name={
                            slot.power ? getPowerIconName(slot.power) : "Role_Freeform"
                          }
                          size={26}
                        />
                        <button
                          className="build-entry__name-button"
                          aria-disabled={isPowerLocked}
                          tabIndex={isPowerLocked ? -1 : undefined}
                          title={getPowerTooltipText(slot.power)}
                          data-power-tooltip={getPowerTooltipAttribute(
                            slot.power,
                            undefined,
                            powersById,
                            damageModsByFramework,
                          )}
                          type="button"
                          onClick={(event: MouseEvent<HTMLButtonElement>) => {
                            event.stopPropagation();

                            if (isPowerLocked) {
                              return;
                            }

                            if (slot.power && isClearSlotClick(event)) {
                              event.preventDefault();
                              onClearPowerSlot(slot.slot);
                              return;
                            }

                            onSelectPowerSlot(slot.slot, {
                              x: event.clientX,
                              y: event.clientY,
                            });
                          }}
                        >
                          {slot.power?.name ?? "Empty power slot"}
                        </button>
                      </div>
                      {slot.power && !isEnergyUnlockPower(slot.power) && (
                        <button
                          className="build-entry__advantages"
                          type="button"
                          onClick={(event: MouseEvent<HTMLButtonElement>) => {
                            event.stopPropagation();
                            onSelectAdvantageSlot(slot.slot, {
                              x: event.clientX,
                              y: event.clientY,
                            });
                          }}
                        >
                          ({selectedAdvantageText(slot, slotAdvantages)})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="power-tier build-section">
          {renderSectionToggle("travel-powers", "Travel Powers")}
          {!closedSections.includes("travel-powers") ? (
            <div className="travel-build-list">
              {travelPowerSlots.map((slot) => {
                const slotAdvantages = slot.power
                  ? getPowerAdvantages(slot.power, advantages)
                  : [];

                return (
                  <div
                    className="build-entry"
                    key={slot.slot}
                    ref={(element) => {
                      if (element) {
                        slotElementsRef.current.set(slot.slot, element);
                      } else {
                        slotElementsRef.current.delete(slot.slot);
                      }
                    }}
                  >
                    <div
                      className={[
                        "build-entry__summary",
                        slot.power ? "" : "build-entry__summary--empty",
                        highlightedTravelPowerTargetSlot === slot.slot
                          ? "build-entry__summary--target"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={(event: MouseEvent<HTMLDivElement>) => {
                        if (slot.power && isClearSlotClick(event)) {
                          event.preventDefault();
                          onClearTravelPowerSlot(slot.slot);
                          return;
                        }

                        onSelectTravelPowerSlot(slot.slot);
                      }}
                    >
                      <div className="build-entry__power-main">
                        <span className="level-label">{slot.level}</span>
                        <SpriteIcon
                          name={
                            slot.power ? getPowerIconName(slot.power) : "Role_Freeform"
                          }
                          size={26}
                        />
                        <button
                          className="build-entry__name-button"
                          title={getPowerTooltipText(slot.power)}
                          data-power-tooltip={getPowerTooltipAttribute(
                            slot.power,
                            undefined,
                            powersById,
                            damageModsByFramework,
                          )}
                          type="button"
                          onClick={(event: MouseEvent<HTMLButtonElement>) => {
                            event.stopPropagation();
                            if (slot.power && isClearSlotClick(event)) {
                              event.preventDefault();
                              onClearTravelPowerSlot(slot.slot);
                              return;
                            }

                            onSelectTravelPowerName(slot.slot, {
                              x: event.clientX,
                              y: event.clientY,
                            });
                          }}
                        >
                          {slot.power?.name ?? "Travel power slot"}
                        </button>
                      </div>
                      {slot.power ? (
                        <button
                          className="build-entry__advantages"
                          type="button"
                          onClick={(event: MouseEvent<HTMLButtonElement>) => {
                            event.stopPropagation();
                            onSelectAdvantageSlot(slot.slot, {
                              x: event.clientX,
                              y: event.clientY,
                            });
                          }}
                        >
                          ({selectedAdvantageText(slot, slotAdvantages)})
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="power-tier build-section">
          {renderSectionToggle("power-variants", "Power Variants")}
          {!closedSections.includes("power-variants") ? (
            <div className="build-extra-section">
              {powerVariantSlots.map((slot, index) => {
                const isPowerVariantIllegal =
                  slot.power !== null &&
                  invalidPowerVariantSlotNumbers.has(slot.slot);
                const hasParentPower = hasPowerVariantParent(
                  slot.power,
                  buildSlots,
                );
                const inheritedAdvantages = getPowerVariantDisplayAdvantages(
                  slot.power,
                  buildSlots,
                  advantages,
                );

                return (
                  <div
                    className="build-entry"
                    key={slot.slot}
                    ref={(element) => {
                      if (element) {
                        slotElementsRef.current.set(slot.slot, element);
                      } else {
                        slotElementsRef.current.delete(slot.slot);
                      }
                    }}
                  >
                    <div
                      className={[
                        "build-entry__summary",
                        slot.power ? "" : "build-entry__summary--empty",
                        isPowerVariantIllegal
                          ? "build-entry__summary--illegal"
                          : "",
                        highlightedPowerVariantTargetSlot === slot.slot
                          ? "build-entry__summary--target"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={(event: MouseEvent<HTMLDivElement>) => {
                        if (slot.power && isClearSlotClick(event)) {
                          event.preventDefault();
                          onClearPowerVariantSlot(slot.slot);
                          return;
                        }

                        onSelectPowerVariantSlot(slot.slot);
                      }}
                    >
                      <div className="build-entry__power-main">
                        <span className="level-label">-</span>
                        <SpriteIcon
                          name={
                            slot.power
                              ? getPowerIconName(slot.power)
                              : "Power_Variant"
                          }
                          size={26}
                        />
                        <button
                          className="build-entry__name-button"
                          title={getPowerTooltipText(slot.power)}
                          data-power-tooltip={getPowerTooltipAttribute(
                            slot.power,
                            undefined,
                            powersById,
                            damageModsByFramework,
                          )}
                          type="button"
                          onClick={(event: MouseEvent<HTMLButtonElement>) => {
                            event.stopPropagation();
                            if (slot.power && isClearSlotClick(event)) {
                              event.preventDefault();
                              onClearPowerVariantSlot(slot.slot);
                              return;
                            }

                            onSelectPowerVariantName(slot.slot, {
                              x: event.clientX,
                              y: event.clientY,
                            });
                          }}
                        >
                          {slot.power?.name ?? `Power variant slot ${index + 1}`}
                        </button>
                      </div>
                      {slot.power ? (
                        <span
                          className={[
                            "build-entry__advantages",
                            !hasParentPower
                              ? "build-entry__advantages--missing-parent"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {hasParentPower
                            ? `(${formatAdvantageText(inheritedAdvantages)})`
                            : "missing parent power"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>

      <div className="build-footer">
        <div className="cams-control">
          <div className="cams-control__icon-menu">
            <button
              aria-expanded={camsMenuOpen}
              aria-label="Select CAMS color"
              className="cams-control__icon-button"
              title="Select CAMS color"
              type="button"
              onClick={onToggleCamsMenu}
            >
              <SpriteIcon name={camsIconName} size={28} />
            </button>
            {camsMenuOpen ? (
              <div className="cams-choice-menu">
                {camsIconOptions.map((option) => (
                  <button
                    className="cams-choice-menu__item"
                    key={option.iconName}
                    title={option.tooltip}
                    type="button"
                    onClick={() => {
                      onSelectCamsIcon(option.iconName);
                      onToggleCamsMenu();
                    }}
                  >
                    <SpriteIcon name={option.iconName} size={22} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <span className="cams-control__label-full">CAMS level :</span>
          <span className="cams-control__label-short">CAMS lvl :</span>
          <strong>{camsLevel}</strong>
          <button
            disabled={camsLevel <= 0}
            type="button"
            onClick={() => onChangeCamsLevel(-1)}
          >
            -
          </button>
          <button
            disabled={camsLevel >= 5}
            type="button"
            onClick={() => onChangeCamsLevel(1)}
          >
            +
          </button>
        </div>
        <p
          className={
            advantageBudgetExceeded
              ? "advantage-points advantage-points--over-budget"
              : "advantage-points"
          }
        >
          <span className="advantage-points__label-full">Advantage points</span>
          <span className="advantage-points__label-short">Adv. points</span>
          {` : ${totalAdvantagePoints} / ${advantagePointBudget}`}
        </p>
      </div>
    </section>
  );
}
