import { useState, type MouseEvent } from "react";
import type { SuperStat } from "@/types/character";
import type { GearBuildSlot, GearItem } from "@/types/gear";
import type { DialogAnchor } from "@/shared/ui/AnchoredDialog";
import { SpriteIcon } from "@/shared/ui/SpriteIcon";
import {
  formatBonusType,
  formatSignedBonusValue,
} from "./gearBonusFormatting";
import { formatGearModRankTooltipText } from "./gearModTooltips";
import { getGearTooltipText } from "./gearTooltips";
import { getGearTotals } from "./gearTotals";

type GearPanelProps = {
  gearSlots: GearBuildSlot[];
  selectedSuperStats: (SuperStat | null)[];
  onToggleCollapse: () => void;
  onSelectGearMod: (
    slotId: string,
    modSlotIndex: number,
    anchor: DialogAnchor,
  ) => void;
  onSelectGearSlot: (slotId: string, anchor: DialogAnchor) => void;
  onOpenFillMods: (anchor: DialogAnchor) => void;
  onOpenGearLibrary: () => void;
};

function getGearIconName(
  gear: GearItem | null | undefined,
  gearType: GearBuildSlot["gearType"],
) {
  return gear?.icon_override
    ? `/gear-icons/${gear.icon_override}.png`
    : `/gear-icons/Gear_Empty_${gearType}.png`;
}

function getSelectedModIconName(
  selectedMod: GearBuildSlot["selectedMods"][number],
) {
  return selectedMod?.mod.icon_override
    ? `/gear-icons/${selectedMod.mod.icon_override}.png`
    : "/gear-icons/Mod_Empty.png";
}

function GearName({ name }: { name: string }) {
  return name.split(/<br\s*\/?>/iu).map((part, index, parts) => (
    <span key={`${part}-${index}`}>
      {part}
      {index + 1 < parts.length ? <br /> : null}
    </span>
  ));
}

function formatModSlotTitle(slotTypes: string[]) {
  return slotTypes
    .filter((slotType) => slotType !== "Multicore")
    .map((slotType) => getModSlotLabel(slotType, "full"))
    .join(" / ");
}

function formatModSlotTooltipTitle(slotTypes: string[]) {
  return slotTypes
    .filter((slotType) => slotType !== "Multicore")
    .map((slotType) => getModSlotTooltipLabel(slotType))
    .join(" / ");
}

function formatCompactModSlotTitle(slotTypes: string[]) {
  return slotTypes
    .filter((slotType) => slotType !== "Multicore")
    .map((slotType) => getModSlotLabel(slotType, "compact"))
    .join(" / ");
}

function getModSlotLabel(slotType: string, mode: "compact" | "full") {
  const labels: Record<string, { compact: string; full: string }> = {
    Armoring: {
      compact: "Arm.",
      full: "Armoring",
    },
    Defense: {
      compact: "Def.",
      full: "Defense",
    },
    Enhancement: {
      compact: "Enh.",
      full: "Enhanc.",
    },
    Offense: {
      compact: "Off.",
      full: "Offense",
    },
    Utility: {
      compact: "Util.",
      full: "Utility",
    },
  };

  return labels[slotType]?.[mode] ?? slotType;
}

function getModSlotTooltipLabel(slotType: string) {
  if (slotType === "Enhancement") {
    return "Enhancement";
  }

  return getModSlotLabel(slotType, "full");
}

function formatSelectedModLabel(
  selectedMod: GearBuildSlot["selectedMods"][number],
) {
  if (!selectedMod) {
    return null;
  }

  if (selectedMod.rank === null) {
    return "Select rank";
  }

  return `${selectedMod.mod.name} R${selectedMod.rank}`;
}

function formatModSlotLabel(
  selectedMod: GearBuildSlot["selectedMods"][number],
  slotTypes: string[],
) {
  return selectedMod
    ? formatSelectedModLabel(selectedMod)
    : formatModSlotTitle(slotTypes);
}

function ModSlotEmptyLabel({ slotTypes }: { slotTypes: string[] }) {
  return (
    <>
      <span className="gear-mod-button__label-full">
        {formatModSlotTitle(slotTypes)}
      </span>
      <span className="gear-mod-button__label-compact">
        {formatCompactModSlotTitle(slotTypes)}
      </span>
    </>
  );
}

function isStatModSlot(slotTypes: string[]) {
  return slotTypes.some(
    (slotType) => slotType === "Armoring" || slotType === "Enhancement",
  );
}

function getDisplayModSlots(gearSlot: GearBuildSlot) {
  const indexedSlots = (gearSlot.gear?.mod_slots ?? []).map(
    (slotTypes, modSlotIndex) => ({
      modSlotIndex,
      slotTypes,
    }),
  );

  if (gearSlot.gearSlot !== "Primary") {
    return indexedSlots;
  }

  const statSlots = indexedSlots.filter(({ slotTypes }) =>
    isStatModSlot(slotTypes),
  );
  const roleSlots = indexedSlots.filter(
    ({ slotTypes }) => !isStatModSlot(slotTypes),
  );
  const rowCount = Math.max(statSlots.length, roleSlots.length);

  return Array.from({ length: rowCount }).flatMap((_, index) =>
    [statSlots[index], roleSlots[index]].filter(
      (slot): slot is (typeof indexedSlots)[number] => Boolean(slot),
    ),
  );
}

function openGearSlot(
  event: MouseEvent<HTMLElement>,
  gearSlot: GearBuildSlot,
  onSelectGearSlot: (slotId: string, anchor: DialogAnchor) => void,
) {
  onSelectGearSlot(gearSlot.id, {
    x: event.clientX,
    y: event.clientY,
  });
}

function getDerivedGearTotals(totals: Array<[string, number]>) {
  const totalsByType = new Map(totals);
  const constitution = totalsByType.get("CON") ?? 0;
  const endurance = totalsByType.get("END") ?? 0;
  const maxHpBonus = totalsByType.get("Max_HP") ?? totalsByType.get("Max HP") ?? 0;
  const maxEnergyBonus =
    totalsByType.get("Max_Energy") ?? totalsByType.get("Max Energy") ?? 0;
  const maxHpFromCon = constitution * 15;
  const maxEnergyFromEnd = endurance;
  const totalMaxHp = maxHpFromCon + maxHpBonus;
  const totalMaxEnergy = maxEnergyFromEnd + maxEnergyBonus;
  const derivedTotals: Array<[string, number]> = [];

  if (constitution > 0) {
    derivedTotals.push(["Max HP from CON", maxHpFromCon]);
  }

  if (endurance > 0) {
    derivedTotals.push(["Max Energy from END", maxEnergyFromEnd]);
  }

  if (totalMaxHp > 0) {
    derivedTotals.push(["Total Max HP", totalMaxHp]);
  }

  if (totalMaxEnergy > 0) {
    derivedTotals.push(["Total Max Energy", totalMaxEnergy]);
  }

  return derivedTotals;
}

export function GearPanel({
  gearSlots,
  selectedSuperStats,
  onToggleCollapse,
  onSelectGearMod,
  onSelectGearSlot,
  onOpenFillMods,
  onOpenGearLibrary,
}: GearPanelProps) {
  const [closedSections, setClosedSections] = useState<string[]>([]);
  const sections = ["Primary", "Secondary"].map((section) => ({
    key: section.toLowerCase(),
    title: `${section} Gear`,
    slots: gearSlots.filter((slot) => slot.gearSlot === section),
  }));
  const totals = getGearTotals(gearSlots, selectedSuperStats);
  const derivedTotals = getDerivedGearTotals(totals);

  function toggleSection(sectionKey: string) {
    setClosedSections((currentClosedSections) =>
      currentClosedSections.includes(sectionKey)
        ? currentClosedSections.filter((key) => key !== sectionKey)
        : [...currentClosedSections, sectionKey],
    );
  }

  function renderSectionToggle(
    sectionKey: string,
    label: string,
    tooltip?: string,
  ) {
    const isClosed = closedSections.includes(sectionKey);

    return (
      <button
        aria-expanded={!isClosed}
        className="power-tier__toggle"
        data-text-tooltip={tooltip}
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

  return (
    <aside className="panel gear-panel">
      <h2 className="gear-panel__title">
        <button
          className="panel-title-button"
          type="button"
          onClick={onToggleCollapse}
        >
          Gear
        </button>
        <span className="gear-panel__title-actions">
          <button
            className="utility-button gear-panel__library-button"
            data-text-tooltip="Fill all your mod slots with chosen R7/R5 stat mods"
            type="button"
            onClick={(event) =>
              onOpenFillMods({
                x: event.clientX,
                y: event.clientY,
              })
            }
          >
            Fill mods
          </button>
          <button
            className="utility-button gear-panel__library-button"
            type="button"
            onClick={onOpenGearLibrary}
          >
            Library
          </button>
        </span>
      </h2>

      <div className="gear-panel__body">
        {sections.map((section) => (
          <section className="power-tier build-section gear-section" key={section.key}>
            {renderSectionToggle(section.key, section.title)}

            {!closedSections.includes(section.key) ? (
              <div className="build-extra-section gear-build-list">
                {section.slots.map((gearSlot) => {
                  return (
                    <div
                      className={[
                        "build-entry",
                        "gear-build-entry",
                        `gear-build-entry--${gearSlot.gearSlot.toLowerCase()}`,
                      ].join(" ")}
                      key={gearSlot.id}
                    >
                      <div
                        className={[
                          "build-entry__summary",
                          `gear-build-entry__summary--${gearSlot.gearType.toLowerCase()}`,
                          gearSlot.gear ? "" : "build-entry__summary--empty",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={(event) =>
                          openGearSlot(event, gearSlot, onSelectGearSlot)
                        }
                      >
                        <div className="build-entry__power-main">
                          <div className="gear-build-entry__gear-icon-slot">
                            <SpriteIcon
                              className="gear-build-entry__gear-icon"
                              name={getGearIconName(
                                gearSlot.gear,
                                gearSlot.gearType,
                              )}
                              size={44}
                            />
                          </div>
                          <div className="gear-build-entry__content">
                            {gearSlot.gear ? (
                              <button
                                className="build-entry__name-button"
                                data-text-tooltip={getGearTooltipText(
                                  gearSlot.gear,
                                )}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openGearSlot(
                                    event,
                                    gearSlot,
                                    onSelectGearSlot,
                                  );
                                }}
                              >
                                <GearName name={gearSlot.gear.name} />
                              </button>
                            ) : (
                              <span className="build-entry__name-button gear-build-entry__empty-label">
                                <GearName
                                  name={`Empty ${gearSlot.gearType.toLowerCase()} gear`}
                                />
                              </span>
                            )}
                            <div
                              className={[
                                "gear-mod-button-list",
                                `gear-mod-button-list--${gearSlot.gearSlot.toLowerCase()}`,
                              ].join(" ")}
                            >
                              {getDisplayModSlots(gearSlot).map(
                                ({ slotTypes, modSlotIndex }) => {
                                  const selectedMod =
                                    gearSlot.selectedMods[modSlotIndex] ?? null;
                                  const modSlotLabel = formatModSlotLabel(
                                    selectedMod,
                                    slotTypes,
                                  );
                                  const modSlotTooltip = selectedMod
                                    ? formatGearModRankTooltipText(
                                        selectedMod.mod,
                                        selectedMod.rank,
                                      )
                                    : `${formatModSlotTooltipTitle(slotTypes)} mod slot`;

                                  return (
                                    <div
                                      className={[
                                        "gear-mod-cell",
                                        selectedMod
                                          ? "gear-mod-button--filled"
                                          : "",
                                        selectedMod
                                          ? ""
                                          : "gear-mod-button--empty",
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}
                                      key={`${gearSlot.id}-${modSlotIndex}`}
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <button
                                        className="gear-mod-button"
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          onSelectGearMod(
                                            gearSlot.id,
                                            modSlotIndex,
                                            {
                                              x: event.clientX,
                                              y: event.clientY,
                                            },
                                          );
                                        }}
                                      >
                                        <SpriteIcon
                                          className="gear-mod-button__placeholder-icon"
                                          name={getSelectedModIconName(
                                            selectedMod,
                                          )}
                                          width={24}
                                          height={32}
                                        />
                                      </button>
                                      {selectedMod ? (
                                        <button
                                          className={[
                                            "gear-mod-button__label",
                                            "gear-mod-button__label-button",
                                            selectedMod.rank === null
                                              ? "gear-mod-button__label-button--pending-rank"
                                              : "",
                                          ]
                                            .filter(Boolean)
                                            .join(" ")}
                                          data-text-tooltip={modSlotTooltip}
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            onSelectGearMod(
                                              gearSlot.id,
                                              modSlotIndex,
                                              {
                                                x: event.clientX,
                                                y: event.clientY,
                                              },
                                            );
                                          }}
                                        >
                                          {modSlotLabel}
                                        </button>
                                      ) : (
                                        <button
                                          className={[
                                            "gear-mod-button__label",
                                            "gear-mod-button__label-button",
                                            "gear-mod-button__label-button--pending-rank",
                                          ].join(" ")}
                                          data-text-tooltip={modSlotTooltip}
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            onSelectGearMod(
                                              gearSlot.id,
                                              modSlotIndex,
                                              {
                                                x: event.clientX,
                                                y: event.clientY,
                                              },
                                            );
                                          }}
                                        >
                                          <ModSlotEmptyLabel
                                            slotTypes={slotTypes}
                                          />
                                        </button>
                                      )}
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        ))}

        <section className="power-tier build-section gear-section gear-totals-section">
          {renderSectionToggle(
            "totals",
            "Totals",
            "Totals only include selected gear, mods, and listed derived values. They do not represent your full in-game character sheet.",
          )}

          {!closedSections.includes("totals") ? (
            totals.length > 0 ? (
              <>
                <dl className="gear-totals-list">
                  {totals.map(([type, value]) => (
                    <div className="gear-totals-list__row" key={type}>
                      <dt>{formatBonusType(type)}</dt>
                      <dd>{formatSignedBonusValue(value, type)}</dd>
                    </div>
                  ))}
                </dl>

                {derivedTotals.length > 0 ? (
                  <div className="gear-derived-totals">
                    <strong>Derived from gear</strong>
                    <dl className="gear-totals-list gear-totals-list--derived">
                      {derivedTotals.map(([type, value]) => (
                        <div className="gear-totals-list__row" key={type}>
                          <dt>{type}</dt>
                          <dd>{formatSignedBonusValue(value, type)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="gear-totals-list__empty">No bonuses selected</p>
            )
          ) : null}
        </section>
      </div>
    </aside>
  );
}
