import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { Advantage } from "@/types/advantages";
import type { BuildSlot } from "@/types/builds";
import type { Power } from "@/types/powers";
import { PowerTooltip } from "@/shared/ui/PowerTooltip";
import {
  registerLazyTooltipProvider,
  unregisterLazyTooltipProvider,
} from "@/shared/ui/instantTooltipDom";
import { getFrameworkIconName, getPowerIconName } from "@/shared/utils/icons";
import {
  getNormalizedPowerType,
  getPowerType,
} from "@/shared/utils/powerTypes";
import { getPowerTooltipText } from "@/shared/utils/powerText";
import {
  getPowerTooltipData,
  type PowerTooltipData,
} from "@/shared/utils/powerTooltip";
import { getEffectGroupTags } from "@/utils/effectGroups";
import { getFrameworkGlossaryTooltipAttribute } from "@/utils/frameworkGlossary";
import {
  powerActivationTypeOptions,
  powerMatchesActivationTypeFilter,
  type PowerActivationTypeFilter,
} from "@/utils/powerActivationTypes";
import {
  getAdvantageDamageTypes,
  getDamageTypeOptions,
  getPowerDamageTypes,
} from "@/utils/powerDamageTypes";
import {
  formatPowerCooldownFilterLabel,
  getCooldownNumbers,
  getPowerCooldownFilterSteps,
  powerMatchesCooldown,
} from "@/utils/powerCooldown";
import {
  formatPowerControlDurationLabel,
  getPowerControlDurations,
  getControlTypesFromSearch,
  getPowerControlDurationSteps,
  powerMatchesControlDuration,
} from "@/utils/powerControlDuration";
import {
  formatPowerRangeFilterLabel,
  getPowerRangeFilterSteps,
  getPowerRangeFeet,
  powerMatchesExactRange,
} from "@/utils/powerRange";
import {
  formatPowerNumericFilterLabel,
  getPowerNumericFilterSteps,
  getPowerNumericRangeBounds,
  getPowerNumericValue,
  powerMatchesNumericValue,
  powerMatchesNumericRange,
  type PowerNumericRange,
  type PowerNumericValueField,
} from "@/utils/powerNumericValues";
import {
  getPowerRoleAdvantageHighlightQueries,
  getPowerRoleOptions,
  getPowerRoles,
} from "@/utils/powerRoles";
import { getSearchTags, type TagSearchColumn } from "@/utils/powerTags";
import {
  powerMatchesTargetingFilter,
  powerTargetingOptions,
  type PowerTargetingFilter,
} from "@/utils/powerTargeting";
import {
  formatFrameworkName,
  getPowerDisplayFrameworkId,
  getPowerFrameworkSortIndex,
  type PowerFrameworkFilterGroup,
  type SelectedFrameworks,
  isCombatPower,
  isPowerVariantDevice,
  isStandardDevice,
  isTravelPower,
  isPowerVisibleInSelectedFrameworks,
  isUltimatePower,
  isUtilityFrameworkFilter,
  isUtilityFrameworkSelection,
  devicesFilterId,
  powerVariantsFilterId,
  travelPowerFilterId,
} from "@/utils/powerFrameworks";
import { SpriteIcon } from "@/shared/ui/SpriteIcon";

type PowersPanelProps = {
  powers: Power[];
  advantages: Advantage[];
  damageModsByFramework: ReadonlyMap<string, string>;
  frameworkGroups: PowerFrameworkFilterGroup[];
  selectedFrameworks: SelectedFrameworks;
  buildSlots: BuildSlot[];
  energyBuilderPanelRequestAction: "close" | "none" | "open";
  energyBuilderPanelRequestSelectionVersion: number;
  energyBuilderPanelRequestVersion: number;
  energyBuilderSelectionVersion: number;
  restrictedPowerIds: Set<number> | null;
  restrictedPowerSectionLabel: string | null;
  canAddPower: (power: Power) => boolean;
  onSelectFramework: (frameworkId: string | null, additive: boolean) => void;
  onAddPower: (power: Power, displayFrameworkId: string | null) => void;
  onToggleCollapse: () => void;
};

type FrameworkStripCell = {
  content: ReactNode;
  isEmpty: boolean;
};

const tierOrder = [-1, 0, 1, 2, 3, 4, null] as const;
const maxFrameworkStripColumns = 14;
const maxPowerGridColumns = 3;
const keptTogetherFrameworkGroupIds = new Set(["martial-arts"]);
const powerVariantsUnlockTooltip =
  "Power Variant Devices have lower values and go on cooldown for 90 sec if you don't own the parent power. Ultimate Power Variants can't be used without the parent power.";
const damageValueFilterTooltip =
  "These values are intended to compare powers with similar activation types. They exclude synergies, conditional bonuses, and secondary effects. They are not a DPS calculation and should be used as a rough reference.\n\nClick / Charged: maximum base damage\nMaintains / DoTs: damage per tick\nCombos: highest base damage dealt by a single combo step";
const healingValueFilterTooltip =
  "These values are intended to compare healing powers with similar activation types. They exclude synergies, conditional bonuses, and secondary effects. They are not an HPS calculation and should be used as a rough reference.\n\nClick / Charged: maximum base healing\nMaintains / HoTs: healing per tick\nCombos: highest base healing provided by a single combo step";
const controlDurationFilterTooltip =
  "Matches any control duration present on the power. Powers with multiple control effects may match multiple values.";
const totalDurationFilterTooltip =
  "Filters powers by activation time plus maximum duration. For charged powers, this uses the maximum charge time. This is mostly useful to compare powers with similar behavior.";
const costFilterTooltip =
  "Filters powers by their listed Energy cost. Single and charged powers use the highest listed cost. Maintains use the per-tick cost: Y in X+Y. Costs paid with HP are excluded.";
const travelFrameworkOrder = [
  "Flight",
  "Superspeed",
  "Superjump",
  "Athletics",
  "Swinging",
  "Teleportation",
];

const travelFrameworkLabels: Record<string, string> = {
  Superjump: "Super Jump",
  Superspeed: "Super Speed",
};
const scalingStatFilterOptions = [
  "STR",
  "DEX",
  "CON",
  "INT",
  "EGO",
  "PRE",
  "REC",
  "END",
];
const maxPinnedPowerTooltips = 2;
const pinnedPowerTooltipMargin = 12;
const pinnedPowerTooltipFallbackWidth = 430;
const pinnedPowerTooltipFallbackHeight = 280;

type PinnedPowerTooltip = {
  locked: boolean;
  powerId: number;
  x: number;
  y: number;
  zIndex: number;
};

type PinnedPowerTooltipWindowProps = {
  advantageHighlightIds: number[];
  advantageHighlightQueries: string[];
  advantageHighlightTagColumns: TagSearchColumn[];
  showAdvantages: boolean;
  tooltip: PowerTooltipData;
  isLocked: boolean;
  x: number;
  y: number;
  zIndex: number;
  onClose: () => void;
  onFocus: () => void;
  onToggleLock: () => void;
  onMove: (x: number, y: number) => void;
};

function keepPinnedPowerTooltipsWithinLimit(
  tooltips: PinnedPowerTooltip[],
) {
  if (tooltips.length < maxPinnedPowerTooltips) {
    return tooltips;
  }

  const hasLockedTooltip = tooltips.some((tooltip) => tooltip.locked);

  if (!hasLockedTooltip) {
    return tooltips.slice(-(maxPinnedPowerTooltips - 1));
  }

  const oldestUnlockedTooltip = tooltips.find((tooltip) => !tooltip.locked);

  if (!oldestUnlockedTooltip) {
    return tooltips.slice(-(maxPinnedPowerTooltips - 1));
  }

  return tooltips.filter(
    (tooltip) => tooltip.powerId !== oldestUnlockedTooltip.powerId,
  );
}

function clampPinnedPowerTooltipPosition(
  x: number,
  y: number,
  element?: HTMLElement | null,
) {
  const width =
    element?.getBoundingClientRect().width ?? pinnedPowerTooltipFallbackWidth;
  const height =
    element?.getBoundingClientRect().height ?? pinnedPowerTooltipFallbackHeight;
  const maxX = Math.max(
    pinnedPowerTooltipMargin,
    window.innerWidth - width - pinnedPowerTooltipMargin,
  );
  const maxY = Math.max(
    pinnedPowerTooltipMargin,
    window.innerHeight - height - pinnedPowerTooltipMargin,
  );

  return {
    x: Math.min(Math.max(x, pinnedPowerTooltipMargin), maxX),
    y: Math.min(Math.max(y, pinnedPowerTooltipMargin), maxY),
  };
}

function getPinnedPowerTooltipStartPosition(
  event: MouseEvent<HTMLButtonElement>,
) {
  const activeTooltip = document.querySelector<HTMLElement>(".instant-tooltip");
  const activeTooltipRect = activeTooltip?.getBoundingClientRect();

  return clampPinnedPowerTooltipPosition(
    activeTooltipRect?.left ?? event.clientX + 14,
    activeTooltipRect?.top ?? event.clientY + 14,
    activeTooltip,
  );
}

function PinnedPowerTooltipWindow({
  advantageHighlightIds,
  advantageHighlightQueries,
  advantageHighlightTagColumns,
  showAdvantages,
  tooltip,
  isLocked,
  x,
  y,
  zIndex,
  onClose,
  onFocus,
  onToggleLock,
  onMove,
}: PinnedPowerTooltipWindowProps) {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const onMoveRef = useRef(onMove);
  const dragStateRef = useRef<{
    offsetX: number;
    offsetY: number;
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useLayoutEffect(() => {
    const tooltipWindow = windowRef.current;

    if (!tooltipWindow || dragStateRef.current) {
      return;
    }

    const nextPosition = clampPinnedPowerTooltipPosition(x, y, tooltipWindow);

    tooltipWindow.style.left = `${nextPosition.x}px`;
    tooltipWindow.style.top = `${nextPosition.y}px`;

    if (nextPosition.x !== x || nextPosition.y !== y) {
      onMoveRef.current(nextPosition.x, nextPosition.y);
    }
  }, [showAdvantages, x, y]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    const rect = windowRef.current?.getBoundingClientRect();

    dragStateRef.current = {
      offsetX: event.clientX - (rect?.left ?? x),
      offsetY: event.clientY - (rect?.top ?? y),
      pointerId: event.pointerId,
      x: rect?.left ?? x,
      y: rect?.top ?? y,
    };

    onFocus();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextPosition = clampPinnedPowerTooltipPosition(
      event.clientX - dragState.offsetX,
      event.clientY - dragState.offsetY,
      windowRef.current,
    );

    dragState.x = nextPosition.x;
    dragState.y = nextPosition.y;

    if (windowRef.current) {
      windowRef.current.style.left = `${nextPosition.x}px`;
      windowRef.current.style.top = `${nextPosition.y}px`;
    }
  }

  function stopDragging(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (dragState?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      onMove(dragState.x, dragState.y);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!showAdvantages) {
      return;
    }

    const advantagesPanel =
      windowRef.current?.querySelector<HTMLElement>(".power-tooltip-advantages");

    if (!advantagesPanel) {
      return;
    }

    advantagesPanel.scrollTop += event.deltaY;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      className={
        showAdvantages
          ? "pinned-power-tooltip pinned-power-tooltip--with-advantages"
          : "pinned-power-tooltip"
      }
      data-no-instant-tooltip
      onWheel={handleWheel}
      ref={windowRef}
      style={{ left: x, top: y, zIndex }}
    >
      <div
        className="pinned-power-tooltip__header"
        onPointerCancel={stopDragging}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
      >
        <button
          aria-label={
            isLocked
              ? `Unlock ${tooltip.title} pinned tooltip`
              : `Lock ${tooltip.title} pinned tooltip`
          }
          aria-pressed={isLocked}
          data-allow-instant-tooltip
          data-text-tooltip="Lock tooltip content"
          className={
            isLocked
              ? "dialog-close pinned-power-tooltip__lock pinned-power-tooltip__lock--active"
              : "dialog-close pinned-power-tooltip__lock"
          }
          type="button"
          onClick={onToggleLock}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {isLocked ? "\u{1F512}" : "\u{1F513}"}
        </button>

        <button
          aria-label={`Close ${tooltip.title} pinned tooltip`}
          className="dialog-close pinned-power-tooltip__close"
          type="button"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
        >
          X
        </button>
      </div>

      <div className="pinned-power-tooltip__body">
        <PowerTooltip
          advantageHighlightIds={advantageHighlightIds}
          advantageHighlightQueries={advantageHighlightQueries}
          advantageHighlightTagColumns={advantageHighlightTagColumns}
          advantageHintText="Hold Shift to see advantages."
          showAdvantages={showAdvantages}
          tooltip={tooltip}
        />
      </div>
    </div>
  );
}

type PowerSortOption =
  | ""
  | "activation_time"
  | "cc_duration"
  | "cooldown"
  | "cost"
  | "damage_values"
  | "healing_values"
  | "max_duration"
  | "range"
  | "total_duration";

const powerSortOptions: { label: string; value: PowerSortOption }[] = [
  { label: "None", value: "" },
  { label: "Damage", value: "damage_values" },
  { label: "Healing", value: "healing_values" },
  { label: "CC duration", value: "cc_duration" },
  { label: "Cost", value: "cost" },
  { label: "Cooldown", value: "cooldown" },
  { label: "Range", value: "range" },
  { label: "Activation Time", value: "activation_time" },
  { label: "Max Duration", value: "max_duration" },
  { label: "Total duration", value: "total_duration" },
];

type NumericRangeFilterProps = {
  field: PowerNumericValueField;
  label: string;
  minimum: number;
  maximum: number;
  maximumIsOpenEnded?: boolean;
  range: PowerNumericRange | null;
  scale?: "cost" | "linear" | "logarithmic";
  step?: number;
  tooltip?: string;
  unit?: string;
  onChange: (range: PowerNumericRange | null) => void;
};

function NumericRangeFilter({
  field,
  label,
  minimum,
  maximum,
  maximumIsOpenEnded = false,
  range,
  scale = "linear",
  step = 1,
  tooltip,
  unit = "",
  onChange,
}: NumericRangeFilterProps) {
  const minimumValue = range?.[0] ?? minimum;
  const maximumValue = range?.[1] ?? maximum;
  const logarithmicSteps = 1000;
  const useLogarithmicScale =
    scale === "logarithmic" && minimum > 0 && maximum > minimum;
  const costScaleBreakpoint = 10;
  const costLowRangeSteps = 50;
  const useCostScale =
    scale === "cost" &&
    minimum < costScaleBreakpoint &&
    maximum > costScaleBreakpoint;
  const useMappedScale = useLogarithmicScale || useCostScale;
  const linearSpan = Math.max(maximum - minimum, step);
  const logarithmicSpan = Math.log(maximum / minimum);
  const costLogarithmicSpan = Math.log(maximum / costScaleBreakpoint);

  function valueToSliderPosition(value: number) {
    if (!useLogarithmicScale) {
      if (!useCostScale) {
        return value;
      }

      if (value <= costScaleBreakpoint) {
        return (
          ((value - minimum) / (costScaleBreakpoint - minimum)) *
          costLowRangeSteps
        );
      }

      return (
        costLowRangeSteps +
        (Math.log(value / costScaleBreakpoint) / costLogarithmicSpan) *
          (logarithmicSteps - costLowRangeSteps)
      );
    }

    return (Math.log(value / minimum) / logarithmicSpan) * logarithmicSteps;
  }

  function sliderPositionToValue(position: number) {
    if (!useLogarithmicScale) {
      if (!useCostScale) {
        return position;
      }

      const rawValue =
        position <= costLowRangeSteps
          ? minimum +
            (position / costLowRangeSteps) *
              (costScaleBreakpoint - minimum)
          : costScaleBreakpoint *
            Math.exp(
              ((position - costLowRangeSteps) /
                (logarithmicSteps - costLowRangeSteps)) *
                costLogarithmicSpan,
            );

      return Math.min(
        maximum,
        Math.max(minimum, Math.round(rawValue / step) * step),
      );
    }

    const rawValue =
      minimum * Math.exp((position / logarithmicSteps) * logarithmicSpan);

    return Math.min(
      maximum,
      Math.max(minimum, Math.round(rawValue / step) * step),
    );
  }

  const sliderMinimum = useMappedScale ? 0 : minimum;
  const sliderMaximum = useMappedScale ? logarithmicSteps : maximum;
  const sliderStep = useMappedScale ? 1 : step;
  const minimumSliderPosition = valueToSliderPosition(minimumValue);
  const maximumSliderPosition = valueToSliderPosition(maximumValue);
  const minimumPosition = useMappedScale
    ? (minimumSliderPosition / logarithmicSteps) * 100
    : ((minimumValue - minimum) / linearSpan) * 100;
  const maximumPosition = useMappedScale
    ? (maximumSliderPosition / logarithmicSteps) * 100
    : ((maximumValue - minimum) / linearSpan) * 100;
  const displayedValue = range
    ? `${minimumValue}-${maximumValue}${
        maximumIsOpenEnded && maximumValue >= maximum ? "+" : ""
      }${unit}`
    : `Any ${label}`;

  function updateRange(nextMinimum: number, nextMaximum: number) {
    if (nextMinimum <= minimum && nextMaximum >= maximum) {
      onChange(null);
      return;
    }

    onChange([nextMinimum, nextMaximum]);
  }

  return (
    <div
      className={`search-filter-panel__field search-filter-panel__field--numeric-range search-filter-panel__field--${field}`}
    >
      <span className="search-filter-panel__label">{label}</span>
      <div className="search-filter-range search-filter-range--double">
        <span
          className="search-filter-range__value"
          data-text-tooltip={tooltip}
        >
          {displayedValue}
        </span>
        <div
          className="search-filter-double-range"
          style={
            {
              "--range-minimum": `${minimumPosition}%`,
              "--range-maximum": `${maximumPosition}%`,
            } as CSSProperties
          }
        >
          <span className="search-filter-double-range__track" />
          <input
            aria-label={`${label} minimum`}
            aria-valuetext={`${minimumValue}${unit}`}
            max={sliderMaximum}
            min={sliderMinimum}
            step={sliderStep}
            type="range"
            value={minimumSliderPosition}
            onChange={(event) =>
              updateRange(
                Math.min(
                  sliderPositionToValue(Number(event.target.value)),
                  maximumValue,
                ),
                maximumValue,
              )
            }
          />
          <input
            aria-label={`${label} maximum`}
            aria-valuetext={`${maximumValue}${
              maximumIsOpenEnded && maximumValue >= maximum ? "+" : ""
            }${unit}`}
            max={sliderMaximum}
            min={sliderMinimum}
            step={sliderStep}
            type="range"
            value={maximumSliderPosition}
            onChange={(event) =>
              updateRange(
                minimumValue,
                Math.max(
                  sliderPositionToValue(Number(event.target.value)),
                  minimumValue,
                ),
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

function getPowerPanelTooltipId(powerId: number) {
  return `powers-panel:${powerId}`;
}

function tierKey(tier: Power["tier"]) {
  return tier === null ? "travel" : String(tier);
}

function tierLabel(tier: Power["tier"]) {
  if (tier === -1) {
    return "Energy builder";
  }

  if (tier === null) {
    return "Variants";
  }

  if (tier === 4) {
    return "Ultimate";
  }

  return `Tier ${tier}`;
}

function sectionUnlockTooltip(sectionKey: string) {
  switch (sectionKey) {
    case "-1":
      return "You may have only one Energy Builder.";
    case "0":
      return "No unlock restrictions.";
    case "1":
      return "You need 1 power from the same framework, including Energy Builders, or 2 non-Energy Builder powers from any framework.";
    case "2":
      return "You need 3 powers from the same framework, including Energy Builders, or 4 non-Energy Builder powers from any framework.";
    case "3":
      return "You need 5 powers from the same framework, including Energy Builders, or 6 non-Energy Builder powers from any framework.";
    case "4":
      return "You may have only one Ultimate power. Ultimate PVD and Ultimate powers share the same cooldown.";
    case "framework-variants":
    case "__power_variants__":
      return powerVariantsUnlockTooltip;
    default:
      return undefined;
  }
}

function travelFrameworkLabel(frameworkId: string | null) {
  if (!frameworkId) {
    return "Travel";
  }

  return travelFrameworkLabels[frameworkId] ?? formatFrameworkName(frameworkId);
}

function travelFrameworkSortIndex(frameworkId: string | null) {
  const index = travelFrameworkOrder.indexOf(frameworkId ?? "");

  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function getPowerSortValue(power: Power, sortOption: PowerSortOption) {
  if (sortOption === "") {
    return null;
  }

  if (sortOption === "cc_duration") {
    const durations = getPowerControlDurations(power);

    return durations.length > 0 ? Math.max(...durations) : null;
  }

  if (sortOption === "cooldown") {
    const cooldowns = getCooldownNumbers(power.cooldown);

    return cooldowns.length > 0 ? Math.max(...cooldowns) : null;
  }

  if (sortOption === "range") {
    return getPowerRangeFeet(power);
  }

  return getPowerNumericValue(power, sortOption);
}

function sortPowersWithinSection(
  powers: Power[],
  sortOption: PowerSortOption,
  fallbackCompare: (a: Power, b: Power) => number,
) {
  const sortedPowers = [...powers];

  if (!sortOption) {
    return sortedPowers.sort(fallbackCompare);
  }

  return sortedPowers.sort((a, b) => {
    const valueA = getPowerSortValue(a, sortOption);
    const valueB = getPowerSortValue(b, sortOption);

    if (valueA === null && valueB === null) {
      return fallbackCompare(a, b);
    }

    if (valueA === null) {
      return 1;
    }

    if (valueB === null) {
      return -1;
    }

    return valueB - valueA || fallbackCompare(a, b);
  });
}

function normalizeSearchText(value: string | null | undefined) {
  return value?.replace(/<br\s*\/?>/gi, " ").toLowerCase() ?? "";
}

function normalizeStrictSearchText(value: string | null | undefined) {
  return normalizeSearchText(value)
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchablePowerType(power: Power) {
  const powerType = getPowerType(power) ?? "";
  const normalizedPowerType = getNormalizedPowerType(power) ?? "";
  const activationType = power.activation_type ?? "";
  const tierType = isUltimatePower(power) ? "Ultimate" : "";
  const powerRoles = getPowerRoles(power).join(" ");
  const powerTypeAliases =
    normalizedPowerType === "TOGGLE_FORM" ? ["Toggle Forms"] : [];

  return [
    powerType,
    powerType.replace(/_/g, " "),
    normalizedPowerType,
    normalizedPowerType.replace(/_/g, " "),
    activationType,
    activationType.replace(/_/g, " "),
    tierType,
    powerRoles,
    ...powerTypeAliases,
  ]
    .filter(Boolean)
    .join(" ");
}

function getSearchableRawPowerType(power: Power) {
  const powerType = getPowerType(power) ?? "";
  const normalizedPowerType = getNormalizedPowerType(power) ?? "";

  return [
    powerType,
    powerType.replace(/_/g, " "),
    normalizedPowerType,
    normalizedPowerType.replace(/_/g, " "),
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeScalingStat(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/giu, "");
}

function isDebugMode() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("dbg") === "1"
  );
}

type SearchPrefix =
  | "activation"
  | "adv"
  | "apply"
  | "damage"
  | "filter"
  | "name"
  | "range"
  | "refresh"
  | "source"
  | "stat"
  | "synergy"
  | "tag"
  | "type";

type ParsedPowerSearch = {
  activationQueries: string[];
  advQueries: string[];
  applyQueries: string[];
  damageQueries: string[];
  filterQueries: string[];
  nameQueries: string[];
  normalQuery: string;
  rangeQueries: string[];
  refreshQueries: string[];
  sourceQueries: string[];
  statQueries: string[];
  synergyQueries: string[];
  tagQueries: string[];
  typeQueries: string[];
};

function parsePowerSearch(search: string): ParsedPowerSearch {
  const trimmedSearch = search.trim();
  const parsedSearch: ParsedPowerSearch = {
    activationQueries: [],
    advQueries: [],
    applyQueries: [],
    damageQueries: [],
    filterQueries: [],
    nameQueries: [],
    normalQuery: "",
    rangeQueries: [],
    refreshQueries: [],
    sourceQueries: [],
    statQueries: [],
    synergyQueries: [],
    tagQueries: [],
    typeQueries: [],
  };
  const prefixRegex =
    /\b(activation|adv|apply|damage|filter|name|range|refresh|source|stat|synergy|tag|type)\s*:/giu;
  const matches = [...trimmedSearch.matchAll(prefixRegex)];

  if (matches.length === 0) {
    parsedSearch.normalQuery = trimmedSearch.toLowerCase();

    return parsedSearch;
  }

  parsedSearch.normalQuery = trimmedSearch
    .slice(0, matches[0]?.index ?? 0)
    .trim()
    .toLowerCase();

  matches.forEach((match, index) => {
    const prefix = match[1]?.toLowerCase() as SearchPrefix | undefined;
    const queryStart = (match.index ?? 0) + match[0].length;
    const queryEnd =
      index + 1 < matches.length
        ? matches[index + 1]?.index ?? trimmedSearch.length
        : trimmedSearch.length;
    const query = trimmedSearch.slice(queryStart, queryEnd).trim().toLowerCase();

    if (!prefix) {
      return;
    }

    if (prefix === "activation") {
      parsedSearch.activationQueries.push(query);
      return;
    }

    if (prefix === "adv") {
      parsedSearch.advQueries.push(query);
      return;
    }

    if (prefix === "apply") {
      parsedSearch.applyQueries.push(query);
      return;
    }

    if (prefix === "damage") {
      parsedSearch.damageQueries.push(query);
      return;
    }

    if (prefix === "filter") {
      parsedSearch.filterQueries.push(query);
      return;
    }

    if (prefix === "name") {
      parsedSearch.nameQueries.push(query);
      return;
    }

    if (prefix === "range") {
      parsedSearch.rangeQueries.push(query);
      return;
    }

    if (prefix === "refresh") {
      parsedSearch.refreshQueries.push(query);
      return;
    }

    if (prefix === "source") {
      parsedSearch.sourceQueries.push(query);
      return;
    }

    if (prefix === "stat") {
      parsedSearch.statQueries.push(query);
      return;
    }

    if (prefix === "synergy") {
      parsedSearch.synergyQueries.push(query);
      return;
    }

    if (prefix === "tag") {
      parsedSearch.tagQueries.push(query);
      return;
    }

    parsedSearch.typeQueries.push(query);
  });

  return parsedSearch;
}

function hasParsedPowerSearch(parsedSearch: ParsedPowerSearch) {
  return (
    Boolean(parsedSearch.normalQuery) ||
    parsedSearch.activationQueries.some(Boolean) ||
    parsedSearch.advQueries.some(Boolean) ||
    parsedSearch.applyQueries.some(Boolean) ||
    parsedSearch.damageQueries.some(Boolean) ||
    parsedSearch.filterQueries.some(Boolean) ||
    parsedSearch.nameQueries.some(Boolean) ||
    parsedSearch.rangeQueries.some(Boolean) ||
    parsedSearch.refreshQueries.some(Boolean) ||
    parsedSearch.sourceQueries.some(Boolean) ||
    parsedSearch.statQueries.some(Boolean) ||
    parsedSearch.synergyQueries.some(Boolean) ||
    parsedSearch.tagQueries.some(Boolean) ||
    parsedSearch.typeQueries.some(Boolean)
  );
}

function parsePowerSearchClauses(search: string) {
  return search
    .split(";")
    .map((searchClause) => parsePowerSearch(searchClause))
    .filter(hasParsedPowerSearch);
}

function mergeParsedPowerSearches(parsedSearches: ParsedPowerSearch[]) {
  return parsedSearches.reduce<ParsedPowerSearch>(
    (mergedSearch, parsedSearch) => ({
      activationQueries: [
        ...mergedSearch.activationQueries,
        ...parsedSearch.activationQueries,
      ],
      advQueries: [...mergedSearch.advQueries, ...parsedSearch.advQueries],
      applyQueries: [
        ...mergedSearch.applyQueries,
        ...parsedSearch.applyQueries,
      ],
      damageQueries: [
        ...mergedSearch.damageQueries,
        ...parsedSearch.damageQueries,
      ],
      filterQueries: [
        ...mergedSearch.filterQueries,
        ...parsedSearch.filterQueries,
      ],
      nameQueries: [...mergedSearch.nameQueries, ...parsedSearch.nameQueries],
      normalQuery: [
        mergedSearch.normalQuery,
        parsedSearch.normalQuery,
      ]
        .filter(Boolean)
        .join(" "),
      rangeQueries: [
        ...mergedSearch.rangeQueries,
        ...parsedSearch.rangeQueries,
      ],
      refreshQueries: [
        ...mergedSearch.refreshQueries,
        ...parsedSearch.refreshQueries,
      ],
      sourceQueries: [
        ...mergedSearch.sourceQueries,
        ...parsedSearch.sourceQueries,
      ],
      statQueries: [
        ...mergedSearch.statQueries,
        ...parsedSearch.statQueries,
      ],
      synergyQueries: [
        ...mergedSearch.synergyQueries,
        ...parsedSearch.synergyQueries,
      ],
      tagQueries: [...mergedSearch.tagQueries, ...parsedSearch.tagQueries],
      typeQueries: [...mergedSearch.typeQueries, ...parsedSearch.typeQueries],
    }),
    {
      activationQueries: [],
      advQueries: [],
      applyQueries: [],
      damageQueries: [],
      filterQueries: [],
      nameQueries: [],
      normalQuery: "",
      rangeQueries: [],
      refreshQueries: [],
      sourceQueries: [],
      statQueries: [],
      synergyQueries: [],
      tagQueries: [],
      typeQueries: [],
    },
  );
}

export function PowersPanel({
  powers,
  advantages,
  damageModsByFramework,
  frameworkGroups,
  selectedFrameworks,
  buildSlots,
  energyBuilderPanelRequestAction,
  energyBuilderPanelRequestSelectionVersion,
  energyBuilderPanelRequestVersion,
  energyBuilderSelectionVersion,
  restrictedPowerIds,
  restrictedPowerSectionLabel,
  canAddPower,
  onSelectFramework,
  onAddPower,
  onToggleCollapse,
}: PowersPanelProps) {
  const [search, setSearch] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isScalingStatMenuOpen, setIsScalingStatMenuOpen] = useState(false);
  const [isDamageTypeMenuOpen, setIsDamageTypeMenuOpen] = useState(false);
  const [selectedPowerRoleFilter, setSelectedPowerRoleFilter] = useState("");
  const [selectedPowerSort, setSelectedPowerSort] = useState<PowerSortOption>("");
  const [selectedScalingStats, setSelectedScalingStats] = useState<string[]>([]);
  const [selectedDamageTypes, setSelectedDamageTypes] = useState<string[]>([]);
  const [selectedTagSearchColumns, setSelectedTagSearchColumns] = useState<
    TagSearchColumn[]
  >([]);
  const [selectedRangeStepIndex, setSelectedRangeStepIndex] = useState(0);
  const [selectedCooldownStepIndex, setSelectedCooldownStepIndex] = useState(0);
  const [selectedCostRange, setSelectedCostRange] =
    useState<PowerNumericRange | null>(null);
  const [selectedDamageValueRange, setSelectedDamageValueRange] =
    useState<PowerNumericRange | null>(null);
  const [selectedHealingValueRange, setSelectedHealingValueRange] =
    useState<PowerNumericRange | null>(null);
  const [selectedTotalDurationStepIndex, setSelectedTotalDurationStepIndex] =
    useState(0);
  const [selectedControlDurationStepIndex, setSelectedControlDurationStepIndex] =
    useState(0);
  const [selectedTargetingFilter, setSelectedTargetingFilter] = useState<
    PowerTargetingFilter | ""
  >("");
  const [selectedActivationTypeFilter, setSelectedActivationTypeFilter] =
    useState<PowerActivationTypeFilter | "">("");
  const [searchInPowers, setSearchInPowers] = useState(true);
  const [searchInAdvantages, setSearchInAdvantages] = useState(false);
  const [showAcquiredPowersOnly, setShowAcquiredPowersOnly] = useState(false);
  const [showPinnedPowerTooltipAdvantages, setShowPinnedPowerTooltipAdvantages] =
    useState(false);
  const [closedSections, setClosedSections] = useState<string[]>([]);
  const [pinnedPowerTooltips, setPinnedPowerTooltips] = useState<
    PinnedPowerTooltip[]
  >([]);
  const [
    handledEnergyBuilderPanelRequestVersion,
    setHandledEnergyBuilderPanelRequestVersion,
  ] = useState(0);
  const [
    reopenedEnergyBuilderSelectionVersion,
    setReopenedEnergyBuilderSelectionVersion,
  ] = useState(0);
  const [frameworkStripColumns, setFrameworkStripColumns] = useState(1);
  const [powerGridColumns, setPowerGridColumns] = useState(maxPowerGridColumns);
  const powersPanelRef = useRef<HTMLElement | null>(null);
  const frameworkStripRef = useRef<HTMLDivElement | null>(null);
  const damageTypeMenuRef = useRef<HTMLDivElement | null>(null);
  const scalingStatMenuRef = useRef<HTMLDivElement | null>(null);
  const pinnedPowerTooltipZIndexRef = useRef(60);
  const parsedSearchClauses = useMemo(
    () => parsePowerSearchClauses(search),
    [search],
  );
  const parsedSearch = useMemo(
    () => mergeParsedPowerSearches(parsedSearchClauses),
    [parsedSearchClauses],
  );
  const selectedControlTypes = useMemo(
    () => getControlTypesFromSearch(search),
    [search],
  );
  const hasAdvantagePrefixSearch = parsedSearch.advQueries.some(Boolean);
  const forceAdvancedPowerTooltip = searchInAdvantages || hasAdvantagePrefixSearch;
  const getHighlightQueries = (query: string) => {
    const effectGroupTags = getEffectGroupTags(query);

    return effectGroupTags.length > 0 ? effectGroupTags : [query];
  };
  const advantageHighlightQueries = [
    ...parsedSearch.advQueries.flatMap(getHighlightQueries),
    ...(searchInAdvantages
      ? parsedSearch.tagQueries.flatMap(getHighlightQueries)
      : []),
    ...(searchInAdvantages
      ? [
          ...parsedSearch.applyQueries,
          ...parsedSearch.filterQueries,
          ...parsedSearch.refreshQueries,
          ...parsedSearch.synergyQueries,
        ].flatMap(getHighlightQueries)
      : []),
    ...(searchInAdvantages
      ? parsedSearchClauses.flatMap((searchClause) =>
          getHighlightQueries(searchClause.normalQuery),
        )
      : []),
    ...(searchInAdvantages ? selectedDamageTypes : []),
    ...(searchInAdvantages && selectedPowerRoleFilter
      ? getPowerRoleAdvantageHighlightQueries(selectedPowerRoleFilter)
      : []),
  ].filter(Boolean);
  const hasEnergyBuilder = buildSlots.some((slot) => slot.power?.tier === -1);
  const hadEnergyBuilderRef = useRef(hasEnergyBuilder);
  const isTravelMode = isUtilityFrameworkSelection(
    selectedFrameworks,
    travelPowerFilterId,
  );
  const isPowerVariantsMode = isUtilityFrameworkSelection(
    selectedFrameworks,
    powerVariantsFilterId,
  );
  const isDevicesMode = isUtilityFrameworkSelection(
    selectedFrameworks,
    devicesFilterId,
  );
  const selectedPowerIds = useMemo(
    () =>
      new Set(
        buildSlots
          .map((slot) => slot.power?.power_id)
          .filter((powerId) => powerId !== undefined),
      ),
    [buildSlots],
  );
  const advantagesById = useMemo(() => {
    return new Map(advantages.map((advantage) => [advantage.advantage_id, advantage]));
  }, [advantages]);
  const powersById = useMemo(() => {
    return new Map(powers.map((power) => [power.power_id, power]));
  }, [powers]);

  useEffect(() => {
    powers.forEach((power) => {
      registerLazyTooltipProvider(
        getPowerPanelTooltipId(power.power_id),
        () => {
          const tooltipData = getPowerTooltipData(
            power,
            advantagesById,
            powersById,
            damageModsByFramework,
          );

          return tooltipData ? { kind: "power", data: tooltipData } : null;
        },
      );
    });

    return () => {
      powers.forEach((power) =>
        unregisterLazyTooltipProvider(getPowerPanelTooltipId(power.power_id)),
      );
    };
  }, [advantagesById, damageModsByFramework, powers, powersById]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Shift") {
        setShowPinnedPowerTooltipAdvantages(true);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === "Shift") {
        setShowPinnedPowerTooltipAdvantages(false);
      }
    }

    function handleWindowBlur() {
      setShowPinnedPowerTooltipAdvantages(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  useEffect(() => {
    if (!isDamageTypeMenuOpen && !isScalingStatMenuOpen) {
      return;
    }

    function closeFilterMenusOnOutsideClick(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        isDamageTypeMenuOpen &&
        !damageTypeMenuRef.current?.contains(target)
      ) {
        setIsDamageTypeMenuOpen(false);
      }

      if (
        isScalingStatMenuOpen &&
        !scalingStatMenuRef.current?.contains(target)
      ) {
        setIsScalingStatMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeFilterMenusOnOutsideClick);

    return () =>
      document.removeEventListener(
        "pointerdown",
        closeFilterMenusOnOutsideClick,
      );
  }, [isDamageTypeMenuOpen, isScalingStatMenuOpen]);

  const powerRoleFilterOptions = useMemo(
    () => getPowerRoleOptions(powers, advantagesById),
    [advantagesById, powers],
  );
  const damageTypeFilterOptions = useMemo(
    () => getDamageTypeOptions(powers, advantages),
    [advantages, powers],
  );
  const targetingFilterOptions = useMemo(
    () =>
      isDebugMode()
        ? powerTargetingOptions
        : powerTargetingOptions.filter((option) => option !== "Special"),
    [],
  );
  const powerRangeSteps = useMemo(
    () => getPowerRangeFilterSteps(powers),
    [powers],
  );
  const powerCooldownSteps = useMemo(
    () => getPowerCooldownFilterSteps(powers),
    [powers],
  );
  const numericValueRecords = useMemo(
    () => [...powers, ...advantages],
    [advantages, powers],
  );
  const powerControlDurationSteps = useMemo(
    () => getPowerControlDurationSteps(numericValueRecords),
    [numericValueRecords],
  );
  const damageValueBounds = useMemo(
    () => getPowerNumericRangeBounds(numericValueRecords, "damage_values"),
    [numericValueRecords],
  );
  const costBounds = useMemo(
    () => getPowerNumericRangeBounds(powers, "cost"),
    [powers],
  );
  const healingValueBounds = useMemo(
    () => getPowerNumericRangeBounds(numericValueRecords, "healing_values"),
    [numericValueRecords],
  );
  const totalDurationSteps = useMemo(
    () => getPowerNumericFilterSteps(powers, "total_duration", 0.01),
    [powers],
  );
  const damageValueMaximum = Math.min(damageValueBounds[1], 2000);
  const healingValueMaximum = Math.min(healingValueBounds[1], 1000);
  const clampedRangeStepIndex =
    selectedRangeStepIndex < powerRangeSteps.length ? selectedRangeStepIndex : 0;
  const clampedCooldownStepIndex =
    selectedCooldownStepIndex < powerCooldownSteps.length
      ? selectedCooldownStepIndex
      : 0;
  const clampedControlDurationStepIndex =
    selectedControlDurationStepIndex < powerControlDurationSteps.length
      ? selectedControlDurationStepIndex
      : 0;
  const clampedTotalDurationStepIndex =
    selectedTotalDurationStepIndex < totalDurationSteps.length
      ? selectedTotalDurationStepIndex
      : 0;
  const selectedMinimumRange = powerRangeSteps[clampedRangeStepIndex] ?? null;
  const selectedCooldown = powerCooldownSteps[clampedCooldownStepIndex] ?? null;
  const selectedControlDuration =
    powerControlDurationSteps[clampedControlDurationStepIndex] ?? null;
  const selectedTotalDuration =
    totalDurationSteps[clampedTotalDurationStepIndex] ?? null;
  const hasActiveAdvancedFilters =
    selectedMinimumRange !== null ||
    selectedCooldown !== null ||
    selectedCostRange !== null ||
    selectedDamageValueRange !== null ||
    selectedHealingValueRange !== null ||
    selectedTotalDuration !== null ||
    selectedControlDuration !== null;
  const advancedFiltersExpanded = isAdvancedFilterOpen;
  const hasHiddenActiveAdvancedFilters =
    hasActiveAdvancedFilters && !advancedFiltersExpanded;

  const hasActivePowerSearchOrFilter =
    hasParsedPowerSearch(parsedSearch) ||
    Boolean(selectedPowerRoleFilter) ||
    selectedScalingStats.length > 0 ||
    selectedDamageTypes.length > 0 ||
    selectedMinimumRange !== null ||
    selectedCooldown !== null ||
    selectedCostRange !== null ||
    selectedDamageValueRange !== null ||
    selectedHealingValueRange !== null ||
    selectedTotalDuration !== null ||
    selectedControlDuration !== null ||
    Boolean(selectedTargetingFilter) ||
    Boolean(selectedActivationTypeFilter) ||
    showAcquiredPowersOnly;
  const includeAllFrameworkPowerVariants =
    selectedFrameworks === null &&
    ((searchInPowers && hasActivePowerSearchOrFilter) || showAcquiredPowersOnly);

  const visiblePowers = useMemo(() => {
    function matchesEffectGroupSearch(values: string[] | undefined, query: string) {
      const effectGroupTags = getEffectGroupTags(query);

      if (effectGroupTags.length === 0) {
        return false;
      }

      return effectGroupTags.some((effectGroupTag) =>
        normalizeSearchText(values?.join(" ")).includes(
          normalizeSearchText(effectGroupTag),
        ),
      );
    }

    function matchesTagValuesSearch(values: string[], query: string) {
      return (
        normalizeSearchText(values.join(" ")).includes(query) ||
        matchesEffectGroupSearch(values, query)
      );
    }

    function matchesGeneralPowerSearch(power: Power, query: string) {
      const powerTags = getSearchTags(power, selectedTagSearchColumns);

      if (selectedTagSearchColumns.length > 0) {
        return matchesTagValuesSearch(powerTags, query);
      }

      return (
        normalizeSearchText(power.name).includes(query) ||
        normalizeSearchText(getSearchablePowerType(power)).includes(query) ||
        normalizeSearchText(power.range_tags?.join(" ")).includes(query) ||
        matchesTagValuesSearch(powerTags, query) ||
        matchesEffectGroupSearch(getPowerDamageTypes(power), query) ||
        normalizeSearchText(power.tooltip).includes(query)
      );
    }

    function matchesGeneralAdvantageSearch(power: Power, query: string) {
      return power.advantages.some((advantageId) => {
        const advantage = advantagesById.get(advantageId);

        if (!advantage) {
          return false;
        }

        const advantageTags = getSearchTags(
          advantage,
          selectedTagSearchColumns,
        );

        if (selectedTagSearchColumns.length > 0) {
          return matchesTagValuesSearch(advantageTags, query);
        }

        return (
          normalizeSearchText(advantage.name).includes(query) ||
          matchesTagValuesSearch(advantageTags, query) ||
          matchesEffectGroupSearch(
            getAdvantageDamageTypes(advantage),
            query,
          ) ||
          normalizeSearchText(advantage.tooltip).includes(query)
        );
      });
    }

    function matchesGeneralSearch(power: Power, query: string) {
      return (
        (searchInPowers && matchesGeneralPowerSearch(power, query)) ||
        (searchInAdvantages && matchesGeneralAdvantageSearch(power, query))
      );
    }

    function matchesScalingStatSearch(power: Power, query: string) {
      const normalizedScalingStatSearch = normalizeScalingStat(query);

      if (!normalizedScalingStatSearch) {
        return true;
      }

      return (power.scaling_stats ?? []).some(
        (scalingStat) =>
          normalizeScalingStat(scalingStat) === normalizedScalingStatSearch,
      );
    }

    function toSearchValues(value: string[] | string | number | null | undefined) {
      if (value === null || value === undefined) {
        return [];
      }

      return Array.isArray(value) ? value.map(String) : [String(value)];
    }

    function toTagValues(value: string[] | string | null | undefined) {
      return toSearchValues(value)
        .flatMap((tag) => tag.split(";"))
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    function getTagColumnValues(
      source: Power | Advantage,
      column: "apply" | "filter" | "refresh" | "synergy",
    ) {
      if (column === "apply") {
        return toTagValues(source.apply_tag);
      }

      if (column === "refresh") {
        return toTagValues(source.refresh_tag);
      }

      if (column === "synergy") {
        return toTagValues(source.synergy_tag);
      }

      return toTagValues(source.filter_tag);
    }

    function matchesTextValuesSearch(
      values: Array<string | number | null | undefined>,
      query: string,
    ) {
      const normalizedQuery = normalizeStrictSearchText(query);

      if (!normalizedQuery) {
        return true;
      }

      return normalizeStrictSearchText(
        values
          .flatMap((value) => toSearchValues(value))
          .join(" "),
      ).includes(normalizedQuery);
    }

    function matchesNameSearch(power: Power, query: string) {
      return matchesTextValuesSearch([power.name], query);
    }

    function matchesSourceSearch(power: Power, query: string) {
      return matchesTextValuesSearch(toSearchValues(power.source), query);
    }

    function matchesTagSearch(power: Power, query: string) {
      const normalizedTagSearch = normalizeStrictSearchText(query);

      if (!normalizedTagSearch) {
        return true;
      }

      const matchesPowerTags =
        searchInPowers &&
        normalizeStrictSearchText(
          getSearchTags(power, selectedTagSearchColumns).join(" "),
        ).includes(
          normalizedTagSearch,
        );

      if (matchesPowerTags) {
        return true;
      }

      if (!searchInAdvantages) {
        return false;
      }

      return power.advantages.some((advantageId) => {
        const advantage = advantagesById.get(advantageId);

        return normalizeStrictSearchText(
          advantage
            ? getSearchTags(advantage, selectedTagSearchColumns).join(" ")
            : "",
        ).includes(
          normalizedTagSearch,
        );
      });
    }

    function matchesTagColumnSearch(
      power: Power,
      query: string,
      column: "apply" | "filter" | "refresh" | "synergy",
    ) {
      const normalizedTagSearch = normalizeStrictSearchText(query);

      if (!normalizedTagSearch) {
        return true;
      }

      const powerTags = getTagColumnValues(power, column);
      const matchesPowerTags =
        searchInPowers &&
        (normalizeStrictSearchText(powerTags.join(" ")).includes(
          normalizedTagSearch,
        ) ||
          matchesEffectGroupSearch(powerTags, query));

      if (matchesPowerTags) {
        return true;
      }

      if (!searchInAdvantages) {
        return false;
      }

      return power.advantages.some((advantageId) => {
        const advantage = advantagesById.get(advantageId);

        if (!advantage) {
          return false;
        }

        const advantageTags = getTagColumnValues(advantage, column);

        return (
          normalizeStrictSearchText(advantageTags.join(" ")).includes(
            normalizedTagSearch,
          ) ||
          matchesEffectGroupSearch(advantageTags, query)
        );
      });
    }

    function matchesAdvantagePrefixSearch(power: Power, query: string) {
      const normalizedQuery = normalizeSearchText(query);

      if (!normalizedQuery) {
        return true;
      }

      return power.advantages.some((advantageId) => {
        const advantage = advantagesById.get(advantageId);

        if (!advantage) {
          return false;
        }

        const advantageTags = getSearchTags(advantage);

        return (
          normalizeSearchText(advantage.name).includes(normalizedQuery) ||
          matchesTagValuesSearch(advantageTags, normalizedQuery) ||
          matchesEffectGroupSearch(
            getAdvantageDamageTypes(advantage),
            normalizedQuery,
          ) ||
          normalizeSearchText(advantage.tooltip).includes(normalizedQuery)
        );
      });
    }

    function matchesRangeSearch(power: Power, query: string) {
      return normalizeStrictSearchText(power.range_tags?.join(" ")).includes(
        normalizeStrictSearchText(query),
      );
    }

    function matchesTypeSearch(power: Power, query: string) {
      return normalizeStrictSearchText(getSearchableRawPowerType(power)).includes(
        normalizeStrictSearchText(query),
      );
    }

    function matchesActivationSearch(power: Power, query: string) {
      return normalizeStrictSearchText(power.activation_type).includes(
        normalizeStrictSearchText(query),
      );
    }

    function matchesDamageTypeFilter(power: Power, damageType: string) {
      if (searchInPowers && getPowerDamageTypes(power).includes(damageType)) {
        return true;
      }

      if (!searchInAdvantages) {
        return false;
      }

      return power.advantages.some((advantageId) => {
        const advantage = advantagesById.get(advantageId);

        return advantage
          ? getAdvantageDamageTypes(advantage).includes(damageType)
          : false;
      });
    }

    function matchesDamageSearch(power: Power, query: string) {
      const normalizedDamageSearch = normalizeStrictSearchText(query);

      if (!normalizedDamageSearch) {
        return true;
      }

      const matchesPowerDamage =
        searchInPowers &&
        normalizeStrictSearchText(getPowerDamageTypes(power).join(" ")).includes(
          normalizedDamageSearch,
        );

      if (matchesPowerDamage) {
        return true;
      }

      if (!searchInAdvantages) {
        return false;
      }

      return power.advantages.some((advantageId) => {
        const advantage = advantagesById.get(advantageId);

        return advantage
          ? normalizeStrictSearchText(
              getAdvantageDamageTypes(advantage).join(" "),
            ).includes(normalizedDamageSearch)
          : false;
      });
    }

    function matchesParsedSearchClause(
      power: Power,
      searchClause: ParsedPowerSearch,
    ) {
      if (
        searchClause.normalQuery &&
        !matchesGeneralSearch(power, searchClause.normalQuery)
      ) {
        return false;
      }

      if (
        searchClause.activationQueries.some(
          (query) => query && !matchesActivationSearch(power, query),
        )
      ) {
        return false;
      }

      if (
        searchClause.advQueries.some(
          (query) => query && !matchesAdvantagePrefixSearch(power, query),
        )
      ) {
        return false;
      }

      if (
        searchClause.applyQueries.some(
          (query) => query && !matchesTagColumnSearch(power, query, "apply"),
        )
      ) {
        return false;
      }

      if (
        searchClause.damageQueries.some(
          (query) => query && !matchesDamageSearch(power, query),
        )
      ) {
        return false;
      }

      if (
        searchClause.rangeQueries.some(
          (query) => query && !matchesRangeSearch(power, query),
        )
      ) {
        return false;
      }

      if (
        searchClause.filterQueries.some(
          (query) => query && !matchesTagColumnSearch(power, query, "filter"),
        )
      ) {
        return false;
      }

      if (
        searchClause.nameQueries.some(
          (query) => query && !matchesNameSearch(power, query),
        )
      ) {
        return false;
      }

      if (
        searchClause.statQueries.some(
          (query) => query && !matchesScalingStatSearch(power, query),
        )
      ) {
        return false;
      }

      if (
        searchClause.refreshQueries.some(
          (query) => query && !matchesTagColumnSearch(power, query, "refresh"),
        )
      ) {
        return false;
      }

      if (
        searchClause.sourceQueries.some(
          (query) => query && !matchesSourceSearch(power, query),
        )
      ) {
        return false;
      }

      if (
        searchClause.synergyQueries.some(
          (query) => query && !matchesTagColumnSearch(power, query, "synergy"),
        )
      ) {
        return false;
      }

      if (
        searchClause.tagQueries.some(
          (query) => query && !matchesTagSearch(power, query),
        )
      ) {
        return false;
      }

      if (
        searchClause.typeQueries.some(
          (query) => query && !matchesTypeSearch(power, query),
        )
      ) {
        return false;
      }

      return true;
    }

    function advantageMatches(
      power: Power,
      predicate: (advantage: Advantage) => boolean,
    ) {
      return power.advantages.some((advantageId) => {
        const advantage = advantagesById.get(advantageId);

        return advantage ? predicate(advantage) : false;
      });
    }

    function matchesNumericValueSources(
      power: Power,
      field: "damage_values" | "healing_values",
      range: PowerNumericRange,
      openEndedMaximum?: number,
    ) {
      return (
        (searchInPowers &&
          powerMatchesNumericRange(
            power,
            field,
            range,
            openEndedMaximum,
          )) ||
        (searchInAdvantages &&
          advantageMatches(power, (advantage) =>
            powerMatchesNumericRange(
              advantage,
              field,
              range,
              openEndedMaximum,
            ),
          ))
      );
    }

    function matchesControlDurationSources(power: Power) {
      if (selectedControlDuration === null) {
        return true;
      }

      return (
        (searchInPowers &&
          powerMatchesControlDuration(
            power,
            selectedControlDuration,
            selectedControlTypes,
          )) ||
        (searchInAdvantages &&
          advantageMatches(power, (advantage) =>
            powerMatchesControlDuration(
              advantage,
              selectedControlDuration,
              selectedControlTypes,
            ),
          ))
      );
    }

    return powers.filter((power) => {
      if (showAcquiredPowersOnly && !selectedPowerIds.has(power.power_id)) {
        return false;
      }

      if (
        restrictedPowerIds !== null &&
        !restrictedPowerIds.has(power.power_id)
      ) {
        return false;
      }

      if (restrictedPowerIds === null) {
        if (isPowerVariantsMode && !isPowerVariantDevice(power)) {
          return false;
        }

        if (isDevicesMode && !isStandardDevice(power)) {
          return false;
        }

        if (isTravelMode && !isTravelPower(power)) {
          return false;
        }

        if (
          !isPowerVariantsMode &&
          !isDevicesMode &&
          !isTravelMode &&
          !isPowerVisibleInSelectedFrameworks(power, selectedFrameworks) &&
          !(includeAllFrameworkPowerVariants && isPowerVariantDevice(power))
        ) {
          return false;
        }
      }

      if (
        selectedPowerRoleFilter &&
        !getPowerRoles(power, {
          advantagesById,
          includeAdvantageTags: searchInAdvantages,
          includePowerMetadata: searchInPowers,
          includePowerTags: searchInPowers,
        }).includes(selectedPowerRoleFilter)
      ) {
        return false;
      }

      if (
        selectedScalingStats.length > 0 &&
        !selectedScalingStats.some((stat) => matchesScalingStatSearch(power, stat))
      ) {
        return false;
      }

      if (
        selectedDamageTypes.length > 0 &&
        !selectedDamageTypes.some((damageType) =>
          matchesDamageTypeFilter(power, damageType),
        )
      ) {
        return false;
      }

      if (
        selectedMinimumRange !== null &&
        !powerMatchesExactRange(power, selectedMinimumRange)
      ) {
        return false;
      }

      if (
        selectedCooldown !== null &&
        !powerMatchesCooldown(power, selectedCooldown)
      ) {
        return false;
      }

      if (
        selectedDamageValueRange !== null &&
        !matchesNumericValueSources(
          power,
          "damage_values",
          selectedDamageValueRange,
          damageValueMaximum,
        )
      ) {
        return false;
      }

      if (
        selectedCostRange !== null &&
        !powerMatchesNumericRange(power, "cost", selectedCostRange)
      ) {
        return false;
      }

      if (
        selectedHealingValueRange !== null &&
        !matchesNumericValueSources(
          power,
          "healing_values",
          selectedHealingValueRange,
          healingValueMaximum,
        )
      ) {
        return false;
      }

      if (
        selectedTotalDuration !== null &&
        !powerMatchesNumericValue(
          power,
          "total_duration",
          selectedTotalDuration,
          0.0051,
        )
      ) {
        return false;
      }

      if (
        selectedControlDuration !== null &&
        !matchesControlDurationSources(power)
      ) {
        return false;
      }

      if (!powerMatchesTargetingFilter(power, selectedTargetingFilter)) {
        return false;
      }

      if (
        !powerMatchesActivationTypeFilter(power, selectedActivationTypeFilter)
      ) {
        return false;
      }

      if (
        parsedSearchClauses.some(
          (searchClause) => !matchesParsedSearchClause(power, searchClause),
        )
      ) {
        return false;
      }

      return true;
    });
  }, [
    advantagesById,
    parsedSearchClauses,
    powers,
    restrictedPowerIds,
    searchInAdvantages,
    searchInPowers,
    selectedPowerIds,
    selectedDamageTypes,
    selectedScalingStats,
    selectedTagSearchColumns,
    selectedMinimumRange,
    selectedCooldown,
    selectedCostRange,
    selectedDamageValueRange,
    selectedHealingValueRange,
    selectedTotalDuration,
    selectedControlDuration,
    selectedControlTypes,
    damageValueMaximum,
    healingValueMaximum,
    selectedTargetingFilter,
    selectedActivationTypeFilter,
    selectedPowerRoleFilter,
    selectedFrameworks,
    includeAllFrameworkPowerVariants,
    isPowerVariantsMode,
    isDevicesMode,
    isTravelMode,
    showAcquiredPowersOnly,
  ]);

  const powerSections = useMemo(() => {
    const nameCompare = (a: Power, b: Power) => a.name.localeCompare(b.name);
    const variantCompare = (a: Power, b: Power) => {
      const variantTypeDifference =
        Number(isUltimatePower(a)) - Number(isUltimatePower(b));

      return variantTypeDifference || nameCompare(a, b);
    };
    const sortSectionPowers = (
      sectionPowers: Power[],
      fallbackCompare = nameCompare,
    ) => sortPowersWithinSection(sectionPowers, selectedPowerSort, fallbackCompare);

    if (restrictedPowerIds !== null) {
      return [
        {
          key: "restricted-powers",
          label: restrictedPowerSectionLabel ?? "Restricted powers",
          powers: sortSectionPowers(visiblePowers),
        },
      ];
    }

    if (isTravelMode) {
      const uniqueFrameworkIds = Array.from(
        new Set(visiblePowers.map((power) => power.framework_id)),
      ).sort((a, b) => {
        const orderDifference =
          travelFrameworkSortIndex(a) - travelFrameworkSortIndex(b);

        return (
          orderDifference ||
          travelFrameworkLabel(a).localeCompare(travelFrameworkLabel(b))
        );
      });

      return uniqueFrameworkIds.map((frameworkId) => ({
        key: `travel-${frameworkId ?? "unknown"}`,
        label: travelFrameworkLabel(frameworkId),
        powers: sortSectionPowers(
          visiblePowers.filter((power) => power.framework_id === frameworkId),
        ),
      }));
    }

    if (isPowerVariantsMode) {
      const uniqueFrameworkIds = Array.from(
        new Set(visiblePowers.map((power) => power.framework_id)),
      ).sort((a, b) => {
        const orderDifference =
          getPowerFrameworkSortIndex(a) - getPowerFrameworkSortIndex(b);

        return (
          orderDifference ||
          formatFrameworkName(a).localeCompare(formatFrameworkName(b))
        );
      });

      return uniqueFrameworkIds.map((frameworkId) => ({
        key: `power-variant-${frameworkId ?? "unknown"}`,
        label: formatFrameworkName(frameworkId) || "Unknown",
        powers: sortSectionPowers(
          visiblePowers.filter((power) => power.framework_id === frameworkId),
          variantCompare,
        ),
      }));
    }

    if (isDevicesMode) {
      const uniqueFrameworkIds = Array.from(
        new Set(visiblePowers.map((power) => power.framework_id)),
      ).sort((a, b) =>
        formatFrameworkName(a).localeCompare(formatFrameworkName(b)),
      );

      return uniqueFrameworkIds.map((frameworkId) => ({
        key: `device-${frameworkId ?? "unknown"}`,
        label: formatFrameworkName(frameworkId) || "Unknown",
        powers: sortSectionPowers(
          visiblePowers.filter((power) => power.framework_id === frameworkId),
        ),
      }));
    }

    const tierSections = tierOrder
      .map((tier) => ({
        key: tierKey(tier),
        label: tierLabel(tier),
        powers: sortSectionPowers(
          visiblePowers.filter(
            (power) => isCombatPower(power) && power.tier === tier,
          ),
        ),
      }))
      .filter((section) => section.powers.length > 0);
    const variantPowers = sortSectionPowers(
      visiblePowers.filter((power) => isPowerVariantDevice(power)),
      variantCompare,
    );

    if (variantPowers.length === 0) {
      return tierSections;
    }

    return [
      ...tierSections,
      {
        key: "framework-variants",
        label: "Variants",
        powers: variantPowers,
      },
    ];
  }, [
    isPowerVariantsMode,
    isDevicesMode,
    isTravelMode,
    restrictedPowerIds,
    restrictedPowerSectionLabel,
    selectedPowerSort,
    visiblePowers,
  ]);

  useEffect(() => {
    const frameworkStripElement = frameworkStripRef.current;

    if (!frameworkStripElement) {
      return;
    }

    const frameworkStrip = frameworkStripElement;

    function updateFrameworkStripColumns() {
      const width = frameworkStrip.clientWidth;
      const styles = window.getComputedStyle(frameworkStrip);
      const frameworkButtonWidth = Number.parseFloat(
        styles.getPropertyValue("--framework-button-width"),
      ) || 34;
      const frameworkStripGap = Number.parseFloat(
        styles.getPropertyValue("--framework-layout-gap") ||
          styles.getPropertyValue("--framework-strip-gap"),
      ) || 5;
      const nextColumns = Math.min(
        maxFrameworkStripColumns,
        Math.max(
          1,
          Math.floor(
            (width + frameworkStripGap) /
              (frameworkButtonWidth + frameworkStripGap),
          ),
        ),
      );

      setFrameworkStripColumns(nextColumns);
    }

    updateFrameworkStripColumns();

    const resizeObserver = new ResizeObserver(updateFrameworkStripColumns);

    resizeObserver.observe(frameworkStrip);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const powersPanelElement = powersPanelRef.current;

    if (!powersPanelElement) {
      return;
    }

    const powersPanel = powersPanelElement;

    function updatePowerGridColumns() {
      const width = powersPanel.clientWidth;
      const styles = window.getComputedStyle(powersPanel);
      const minColumnWidth =
        Number.parseFloat(styles.getPropertyValue("--power-grid-min-column-width")) ||
        170;
      const columnGap =
        Number.parseFloat(styles.getPropertyValue("--power-grid-column-gap")) || 8;
      const nextColumns = Math.min(
        maxPowerGridColumns,
        Math.max(
          1,
          Math.floor((width + columnGap) / (minColumnWidth + columnGap)),
        ),
      );

      setPowerGridColumns((currentColumns) =>
        currentColumns === nextColumns ? currentColumns : nextColumns,
      );
    }

    updatePowerGridColumns();

    const resizeObserver = new ResizeObserver(updatePowerGridColumns);

    resizeObserver.observe(powersPanel);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (hasEnergyBuilder && !hadEnergyBuilderRef.current) {
      setClosedSections((currentClosedSections) =>
        currentClosedSections.includes("-1")
          ? currentClosedSections
          : [...currentClosedSections, "-1"],
      );
    }

    hadEnergyBuilderRef.current = hasEnergyBuilder;
  }, [hasEnergyBuilder]);

  function toggleSection(key: string) {
    if (key === "-1") {
      if (isSectionClosed(key)) {
        setClosedSections((currentClosedSections) =>
          currentClosedSections.filter((closedSection) => closedSection !== key),
        );
        setHandledEnergyBuilderPanelRequestVersion(
          energyBuilderPanelRequestVersion,
        );
        setReopenedEnergyBuilderSelectionVersion(
          energyBuilderSelectionVersion,
        );
        return;
      }

      setHandledEnergyBuilderPanelRequestVersion(
        energyBuilderPanelRequestVersion,
      );
      setClosedSections((currentClosedSections) => [
        ...currentClosedSections,
        key,
      ]);
      return;
    }

    setClosedSections((currentClosedSections) => {
      if (currentClosedSections.includes(key)) {
        return currentClosedSections.filter(
          (closedSection) => closedSection !== key,
        );
      }

      return [...currentClosedSections, key];
    });
  }

  function isSectionClosed(key: string) {
    const hasActiveEnergyBuilderReopenRequest =
      key === "-1" &&
      energyBuilderPanelRequestVersion >
        handledEnergyBuilderPanelRequestVersion &&
      energyBuilderPanelRequestAction === "open" &&
      energyBuilderPanelRequestSelectionVersion >= energyBuilderSelectionVersion;

    if (hasActiveEnergyBuilderReopenRequest) {
      return false;
    }

    const hasActiveEnergyBuilderCloseRequest =
      key === "-1" &&
      energyBuilderPanelRequestVersion >
        handledEnergyBuilderPanelRequestVersion &&
      energyBuilderPanelRequestAction === "close";

    if (hasActiveEnergyBuilderCloseRequest) {
      return true;
    }

    return (
      closedSections.includes(key) ||
      (key === "-1" &&
        energyBuilderSelectionVersion > reopenedEnergyBuilderSelectionVersion)
    );
  }

  function toggleScalingStatFilter(stat: string, isSelected: boolean) {
    setSelectedScalingStats((currentStats) => {
      if (isSelected) {
        return currentStats.includes(stat)
          ? currentStats
          : [...currentStats, stat];
      }

      return currentStats.filter((currentStat) => currentStat !== stat);
    });
  }

  function toggleDamageTypeFilter(damageType: string, isSelected: boolean) {
    setSelectedDamageTypes((currentDamageTypes) => {
      if (isSelected) {
        return currentDamageTypes.includes(damageType)
          ? currentDamageTypes
          : [...currentDamageTypes, damageType];
      }

      return currentDamageTypes.filter(
        (currentDamageType) => currentDamageType !== damageType,
      );
    });
  }

  function toggleTagSearchColumn(column: TagSearchColumn, isSelected: boolean) {
    setSelectedTagSearchColumns((currentColumns) => {
      if (isSelected) {
        return currentColumns.includes(column)
          ? currentColumns
          : [...currentColumns, column];
      }

      return currentColumns.filter((currentColumn) => currentColumn !== column);
    });
  }

  function selectedScalingStatsLabel() {
    return selectedScalingStats.length > 0
      ? selectedScalingStats.join(";")
      : "Any Superstat";
  }

  function selectedDamageTypesLabel() {
    return selectedDamageTypes.length > 0
      ? selectedDamageTypes.join(";")
      : "Any Damage type";
  }

  function selectedRangeLabel() {
    return formatPowerRangeFilterLabel(selectedMinimumRange);
  }

  function selectedCooldownLabel() {
    return formatPowerCooldownFilterLabel(selectedCooldown);
  }

  function selectedTotalDurationLabel() {
    return formatPowerNumericFilterLabel(
      selectedTotalDuration,
      "Any Cycle time",
      " sec",
      2,
    );
  }

  function getValueFilterAdvantageHighlightIds(power: Power) {
    if (!searchInAdvantages) {
      return [];
    }

    return power.advantages.filter((advantageId) => {
      const advantage = advantagesById.get(advantageId);

      if (!advantage) {
        return false;
      }

      return (
        (selectedDamageValueRange !== null &&
          powerMatchesNumericRange(
            advantage,
            "damage_values",
            selectedDamageValueRange,
            damageValueMaximum,
          )) ||
        (selectedHealingValueRange !== null &&
          powerMatchesNumericRange(
            advantage,
            "healing_values",
            selectedHealingValueRange,
            healingValueMaximum,
          )) ||
        (selectedControlDuration !== null &&
          powerMatchesControlDuration(
            advantage,
            selectedControlDuration,
            selectedControlTypes,
          ))
      );
    });
  }

  function getSelectedPowerDisplayFrameworkId(power: Power) {
    return getPowerDisplayFrameworkId(
      power,
      selectedFrameworks?.find(
        (frameworkId) =>
          !isUtilityFrameworkFilter(frameworkId) &&
          isPowerVisibleInSelectedFrameworks(power, [frameworkId]),
      ) ?? null,
    );
  }

  function bringPinnedPowerTooltipToFront(powerId: number) {
    pinnedPowerTooltipZIndexRef.current += 1;
    const zIndex = pinnedPowerTooltipZIndexRef.current;

    setPinnedPowerTooltips((currentTooltips) =>
      currentTooltips.map((tooltip) =>
        tooltip.powerId === powerId ? { ...tooltip, zIndex } : tooltip,
      ),
    );
  }

  function canPinPowerTooltip(power: Power) {
    const tooltipData = getPowerTooltipData(
      power,
      advantagesById,
      powersById,
      damageModsByFramework,
    );

    return Boolean(
      tooltipData &&
        (tooltipData.advantages.length > 0 ||
          tooltipData.hasHiddenRankAdvantages),
    );
  }

  function suppressCurrentPowerTooltipUntilPointerLeave(
    element: HTMLButtonElement,
  ) {
    const activeTooltip = document.querySelector<HTMLElement>(".instant-tooltip");
    activeTooltip?.setAttribute("data-pinned-suppressed", "true");

    element.addEventListener(
      "pointerleave",
      () => activeTooltip?.removeAttribute("data-pinned-suppressed"),
      { once: true },
    );
  }

  function pinPowerTooltip(power: Power, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const position = getPinnedPowerTooltipStartPosition(event);
    suppressCurrentPowerTooltipUntilPointerLeave(event.currentTarget);
    pinnedPowerTooltipZIndexRef.current += 1;
    const zIndex = pinnedPowerTooltipZIndexRef.current;

    setPinnedPowerTooltips((currentTooltips) => {
      const existingTooltip = currentTooltips.find(
        (tooltip) => tooltip.powerId === power.power_id,
      );

      if (existingTooltip) {
        return currentTooltips.map((tooltip) =>
          tooltip.powerId === power.power_id
            ? { ...tooltip, x: position.x, y: position.y, zIndex }
            : tooltip,
        );
      }

      const keptTooltips =
        keepPinnedPowerTooltipsWithinLimit(currentTooltips);

      return [
        ...keptTooltips,
        {
          locked: false,
          powerId: power.power_id,
          x: position.x,
          y: position.y,
          zIndex,
        },
      ];
    });
  }

  function movePinnedPowerTooltip(powerId: number, x: number, y: number) {
    setPinnedPowerTooltips((currentTooltips) =>
      currentTooltips.map((tooltip) =>
        tooltip.powerId === powerId ? { ...tooltip, x, y } : tooltip,
      ),
    );
  }

  function closePinnedPowerTooltip(powerId: number) {
    setPinnedPowerTooltips((currentTooltips) =>
      currentTooltips.filter((tooltip) => tooltip.powerId !== powerId),
    );
  }

  function togglePinnedPowerTooltipLock(powerId: number) {
    setPinnedPowerTooltips((currentTooltips) =>
      currentTooltips.map((tooltip) =>
        tooltip.powerId === powerId
          ? { ...tooltip, locked: !tooltip.locked }
          : { ...tooltip, locked: false },
      ),
    );
  }

  function handlePowerChoiceClick(
    power: Power,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    if (event.ctrlKey || event.metaKey) {
      if (canPinPowerTooltip(power)) {
        pinPowerTooltip(power, event);
      }

      return;
    }

    onAddPower(power, getSelectedPowerDisplayFrameworkId(power));
  }

  function resetAdvancedFilters() {
    setSearch("");
    setSelectedPowerRoleFilter("");
    setSelectedPowerSort("");
    setSelectedScalingStats([]);
    setSelectedDamageTypes([]);
    setSelectedTagSearchColumns([]);
    setSelectedRangeStepIndex(0);
    setSelectedCooldownStepIndex(0);
    setSelectedCostRange(null);
    setSelectedDamageValueRange(null);
    setSelectedHealingValueRange(null);
    setSelectedTotalDurationStepIndex(0);
    setSelectedControlDurationStepIndex(0);
    setSelectedTargetingFilter("");
    setSelectedActivationTypeFilter("");
    setIsScalingStatMenuOpen(false);
    setIsDamageTypeMenuOpen(false);
  }

  function renderFrameworkStripItems() {
    const frameworkStripRows = 2;
    const firstFrameworkColumn = () => 0;
    const utilityGroup = frameworkGroups.find(
      (frameworkGroup) => frameworkGroup.id === "utility",
    );
    const standardFrameworkGroups = frameworkGroups.filter(
      (frameworkGroup) => frameworkGroup.id !== "utility",
    );
    const cells: FrameworkStripCell[] = Array.from(
      { length: frameworkStripColumns * frameworkStripRows },
      (_, index) => ({
        content: (
          <span
            className="framework-spacer"
            aria-hidden="true"
            key={`framework-empty-${index}`}
          />
        ),
        isEmpty: true,
      }),
    );

    function createFrameworkButton(
      key: string,
      isActive: boolean,
      isDisabled: boolean,
      iconName: string,
      title: string,
      onClick: (event: MouseEvent<HTMLButtonElement>) => void,
      showMultiSelectHint = false,
    ) {
      const isPowerVariantsButton = key === powerVariantsFilterId;
      const hint =
        showMultiSelectHint && !isPowerVariantsButton
          ? "Hold Shift to select multiple framework."
          : null;
      const frameworkTooltip = isPowerVariantsButton
        ? undefined
        : getFrameworkGlossaryTooltipAttribute(key, title, hint);

      return (
        <button
          className={
            isActive
              ? "framework-button framework-button--active"
              : "framework-button"
          }
          disabled={isDisabled}
          key={key}
          onClick={onClick}
          title={isPowerVariantsButton ? powerVariantsUnlockTooltip : title}
          data-framework-tooltip={frameworkTooltip}
        >
          <SpriteIcon
            className="framework-button__icon"
            name={iconName}
            size={40}
          />
        </button>
      );
    }

    let row = 0;
    let column = firstFrameworkColumn();

    standardFrameworkGroups.forEach((frameworkGroup) => {
      if (
        keptTogetherFrameworkGroupIds.has(frameworkGroup.id) &&
        column + frameworkGroup.filters.length > frameworkStripColumns
      ) {
        row += 1;
        column = firstFrameworkColumn();
      }

      frameworkGroup.filters.forEach((framework) => {
        if (column >= frameworkStripColumns) {
          row += 1;
          column = firstFrameworkColumn();
        }

        if (row >= frameworkStripRows) {
          return;
        }

        const cellIndex = row * frameworkStripColumns + column;

        cells[cellIndex] = {
          content: createFrameworkButton(
            framework.id,
            selectedFrameworks?.includes(framework.id) ?? false,
            !framework.selectable,
            framework.iconId ?? getFrameworkIconName(framework.id),
            framework.title,
            (event) => {
              const isActive = selectedFrameworks?.includes(framework.id) ?? false;
              onSelectFramework(
                isActive && !event.shiftKey ? null : framework.id,
                event.shiftKey,
              );
            },
            true,
          ),
          isEmpty: false,
        };
        column += 1;
      });
    });

    if (utilityGroup && column < frameworkStripColumns) {
      column += 1;
    } else if (utilityGroup) {
      row += 1;
      column = firstFrameworkColumn() + 1;
    }

    utilityGroup?.filters.forEach((framework) => {
      if (column >= frameworkStripColumns) {
        row += 1;
        column = firstFrameworkColumn();
      }

      if (row >= frameworkStripRows) {
        return;
      }

      const cellIndex = row * frameworkStripColumns + column;

      cells[cellIndex] = {
        content: createFrameworkButton(
          framework.id,
          isUtilityFrameworkSelection(selectedFrameworks, framework.id),
          !framework.selectable,
          framework.iconId ?? getFrameworkIconName(framework.id),
          framework.title,
          () => {
            const isActive = isUtilityFrameworkSelection(
              selectedFrameworks,
              framework.id,
            );

            onSelectFramework(isActive ? null : framework.id, false);
          },
          false,
        ),
        isEmpty: false,
      };
      column += 1;
    });

    return cells.map((cell, index) => {
      const cellRow = Math.floor(index / frameworkStripColumns);
      const cellColumn = index % frameworkStripColumns;
      const cellStyle = {
        gridColumn: cellColumn + 1,
        gridRow: cellRow + 1,
      } satisfies CSSProperties;

      return (
        <span
          className={[
            "framework-cell",
            cell.isEmpty ? "framework-cell--empty" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          key={`framework-cell-${index}`}
          style={cellStyle}
        >
          {cell.content}
        </span>
      );
    });
  }

  const pinnedPowerTooltipWindows =
    typeof document === "undefined"
      ? null
      : createPortal(
          pinnedPowerTooltips.map((pinnedTooltip) => {
            const power = powersById.get(pinnedTooltip.powerId);
            const tooltipData = getPowerTooltipData(
              power,
              advantagesById,
              powersById,
              damageModsByFramework,
            );

            if (!power || !tooltipData) {
              return null;
            }

            const highlightedAdvantageIds =
              getValueFilterAdvantageHighlightIds(power);

            return (
              <PinnedPowerTooltipWindow
                advantageHighlightIds={highlightedAdvantageIds}
                advantageHighlightQueries={advantageHighlightQueries}
                advantageHighlightTagColumns={selectedTagSearchColumns}
                showAdvantages={showPinnedPowerTooltipAdvantages}
                isLocked={pinnedTooltip.locked}
                key={pinnedTooltip.powerId}
                tooltip={tooltipData}
                x={pinnedTooltip.x}
                y={pinnedTooltip.y}
                zIndex={pinnedTooltip.zIndex}
                onClose={() => closePinnedPowerTooltip(power.power_id)}
                onFocus={() => bringPinnedPowerTooltipToFront(power.power_id)}
                onToggleLock={() =>
                  togglePinnedPowerTooltipLock(power.power_id)
                }
                onMove={(x, y) => movePinnedPowerTooltip(power.power_id, x, y)}
              />
            );
          }),
          document.body,
        );

  return (
    <>
      <section
        className="panel powers-panel"
        ref={powersPanelRef}
        style={
          {
            "--power-grid-columns": powerGridColumns,
          } as CSSProperties
        }
      >
      <h2>
        <button
          className="panel-title-button"
          type="button"
          onClick={onToggleCollapse}
        >
          Powers
        </button>
      </h2>

      <div
        className="framework-strip"
        aria-label="Power frameworks"
        ref={frameworkStripRef}
        style={
          {
            "--framework-strip-columns": frameworkStripColumns,
          } as CSSProperties
        }
      >
        {renderFrameworkStripItems()}
      </div>

      <div className="search-row">
        <div className="search-field">
          <label htmlFor="powers-search">Search powers</label>
          <input
            id="powers-search"
            value={search}
            placeholder="Search powers..."
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? (
            <button
              aria-label="Clear power search"
              className="search-field__clear"
              type="button"
              onClick={() => setSearch("")}
            >
              X
            </button>
          ) : null}
        </div>
        <label
          className="search-scope-checkbox"
          data-text-tooltip="Search within powers: name, tooltip, tags, damage, range, type, and metadata."
        >
          <input
            checked={searchInPowers}
            type="checkbox"
            onChange={(event) => setSearchInPowers(event.target.checked)}
          />
          <span>Powers</span>
        </label>
        <label
          className="search-scope-checkbox"
          data-text-tooltip="Search within advantages: name, tooltip, tags, and damage type. Also shows detailed power tooltips."
        >
          <input
            checked={searchInAdvantages}
            type="checkbox"
            onChange={(event) => setSearchInAdvantages(event.target.checked)}
          />
          <span>Adv.</span>
        </label>
        <button
          aria-label="Expand advanced power filters"
          aria-expanded={isFilterPanelOpen}
          className={
            isFilterPanelOpen
              ? "search-filter-button search-filter-button--active"
              : "search-filter-button"
          }
          type="button"
          onClick={() => setIsFilterPanelOpen((isOpen) => !isOpen)}
        >
          Filter
        </button>
      </div>

      {isFilterPanelOpen ? (
        <div className="search-filter-panel">
          <div
            aria-label="Tag search columns"
            className="search-filter-panel__tag-columns"
          >
            {[
              { label: "Apply", value: "apply" },
              { label: "Refresh", value: "refresh" },
              { label: "Synergize", value: "synergy" },
            ].map((option) => (
              <label
                className="search-filter-panel__checkbox search-filter-panel__checkbox--tag-column"
                key={option.value}
              >
                <input
                  checked={selectedTagSearchColumns.includes(
                    option.value as TagSearchColumn,
                  )}
                  type="checkbox"
                  onChange={(event) =>
                    toggleTagSearchColumn(
                      option.value as TagSearchColumn,
                      event.target.checked,
                    )
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
            <label
              className="search-filter-panel__checkbox search-filter-panel__checkbox--tag-column"
              data-text-tooltip="Only show powers currently acquired in this build."
            >
              <input
                checked={showAcquiredPowersOnly}
                type="checkbox"
                onChange={(event) =>
                  setShowAcquiredPowersOnly(event.target.checked)
                }
              />
              <span>Acquired</span>
            </label>
            <label
              className="search-filter-panel__sort"
              data-text-tooltip="Sorting by descending order among same tier"
            >
              <span>Sort by</span>
              <select
                value={selectedPowerSort}
                onChange={(event) =>
                  setSelectedPowerSort(event.target.value as PowerSortOption)
                }
              >
                {powerSortOptions.map((option) => (
                  <option key={option.value || "none"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="search-filter-panel__field search-filter-panel__field--type">
            <span className="search-filter-panel__label">Function</span>
            <select
              value={selectedPowerRoleFilter}
              onChange={(event) => setSelectedPowerRoleFilter(event.target.value)}
            >
              <option value="">Any function</option>
              {powerRoleFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="search-filter-panel__field search-filter-panel__field--targeting">
            <span className="search-filter-panel__label">Targeting</span>
            <select
              value={selectedTargetingFilter}
              onChange={(event) =>
                setSelectedTargetingFilter(
                  event.target.value as PowerTargetingFilter | "",
                )
              }
            >
              <option value="">Any targeting</option>
              {targetingFilterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="search-filter-panel__field search-filter-panel__field--activation">
            <span className="search-filter-panel__label">Activation type</span>
            <select
              value={selectedActivationTypeFilter}
              onChange={(event) =>
                setSelectedActivationTypeFilter(
                  event.target.value as PowerActivationTypeFilter | "",
                )
              }
            >
              <option value="">Any activation</option>
              {powerActivationTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div
            className="search-filter-panel__field search-filter-panel__field--damage"
            ref={damageTypeMenuRef}
          >
            <span className="search-filter-panel__label">Damage type</span>
            <div className="search-filter-dropdown">
              <button
                aria-expanded={isDamageTypeMenuOpen}
                className="search-filter-dropdown__button"
                type="button"
                onClick={() => setIsDamageTypeMenuOpen((isOpen) => !isOpen)}
              >
                <span>{selectedDamageTypesLabel()}</span>
                <span className="search-filter-dropdown__arrow" />
              </button>

              {isDamageTypeMenuOpen ? (
                <div className="search-filter-dropdown__menu search-filter-dropdown__menu--damage">
                  {damageTypeFilterOptions.map((damageType) => (
                    <label
                      className="search-filter-panel__checkbox search-filter-panel__checkbox--stat"
                      key={damageType}
                    >
                      <input
                        checked={selectedDamageTypes.includes(damageType)}
                        type="checkbox"
                        onChange={(event) =>
                          toggleDamageTypeFilter(
                            damageType,
                            event.target.checked,
                          )
                        }
                      />
                      <span>{damageType}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div
            className="search-filter-panel__field search-filter-panel__field--stats"
            ref={scalingStatMenuRef}
          >
            <span className="search-filter-panel__label">Scaling stats</span>
            <div className="search-filter-dropdown">
              <button
                aria-expanded={isScalingStatMenuOpen}
                className="search-filter-dropdown__button"
                type="button"
                onClick={() => setIsScalingStatMenuOpen((isOpen) => !isOpen)}
              >
                <span>{selectedScalingStatsLabel()}</span>
                <span className="search-filter-dropdown__arrow" />
              </button>

              {isScalingStatMenuOpen ? (
                <div className="search-filter-dropdown__menu">
                  {scalingStatFilterOptions.map((stat) => (
                    <label
                      className="search-filter-panel__checkbox search-filter-panel__checkbox--stat"
                      key={stat}
                    >
                      <input
                        checked={selectedScalingStats.includes(stat)}
                        type="checkbox"
                        onChange={(event) =>
                          toggleScalingStatFilter(stat, event.target.checked)
                        }
                      />
                      <span>{stat}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <label
            className={`search-filter-panel__checkbox search-filter-panel__advanced-toggle${
              hasHiddenActiveAdvancedFilters
                ? " search-filter-panel__advanced-toggle--active"
                : ""
            }`}
          >
            <span>Show Advanced options</span>
            <input
              checked={advancedFiltersExpanded}
              type="checkbox"
              onChange={(event) =>
                setIsAdvancedFilterOpen(event.target.checked)
              }
            />
          </label>

          {advancedFiltersExpanded ? (
            <div className="search-filter-panel__advanced">
              <label className="search-filter-panel__field search-filter-panel__field--range">
                <span className="search-filter-panel__label">Range</span>
                <div className="search-filter-range">
                  <span className="search-filter-range__value">
                    {selectedRangeLabel()}
                  </span>
                  <input
                    max={powerRangeSteps.length - 1}
                    min={0}
                    type="range"
                    value={clampedRangeStepIndex}
                    onChange={(event) =>
                      setSelectedRangeStepIndex(Number(event.target.value))
                    }
                  />
                </div>
              </label>

              <label className="search-filter-panel__field search-filter-panel__field--cooldown">
                <span className="search-filter-panel__label">Cooldown</span>
                <div className="search-filter-range">
                  <span className="search-filter-range__value">
                    {selectedCooldownLabel()}
                  </span>
                  <input
                    max={powerCooldownSteps.length - 1}
                    min={0}
                    type="range"
                    value={clampedCooldownStepIndex}
                    onChange={(event) =>
                      setSelectedCooldownStepIndex(Number(event.target.value))
                    }
                  />
                </div>
              </label>

              <label className="search-filter-panel__field search-filter-panel__field--control-duration">
                <span className="search-filter-panel__label">CC duration</span>
                <div className="search-filter-range search-filter-range--wide">
                  <span
                    className="search-filter-range__value"
                    data-text-tooltip={controlDurationFilterTooltip}
                  >
                    {formatPowerControlDurationLabel(selectedControlDuration)}
                  </span>
                  <input
                    max={powerControlDurationSteps.length - 1}
                    min={0}
                    type="range"
                    value={clampedControlDurationStepIndex}
                    onChange={(event) =>
                      setSelectedControlDurationStepIndex(
                        Number(event.target.value),
                      )
                    }
                  />
                </div>
              </label>

              <label className="search-filter-panel__field search-filter-panel__field--total-duration">
                <span className="search-filter-panel__label">
                  Total duration
                </span>
                <div className="search-filter-range search-filter-range--wide">
                  <span
                    className="search-filter-range__value"
                    data-text-tooltip={totalDurationFilterTooltip}
                  >
                    {selectedTotalDurationLabel()}
                  </span>
                  <input
                    max={totalDurationSteps.length - 1}
                    min={0}
                    type="range"
                    value={clampedTotalDurationStepIndex}
                    onChange={(event) =>
                      setSelectedTotalDurationStepIndex(
                        Number(event.target.value),
                      )
                    }
                  />
                </div>
              </label>

              <NumericRangeFilter
                field="damage_values"
                label="Damage"
                minimum={damageValueBounds[0]}
                maximum={damageValueMaximum}
                maximumIsOpenEnded={damageValueBounds[1] > damageValueMaximum}
                range={selectedDamageValueRange}
                scale="logarithmic"
                tooltip={damageValueFilterTooltip}
                onChange={setSelectedDamageValueRange}
              />

              <NumericRangeFilter
                field="healing_values"
                label="Heal"
                minimum={healingValueBounds[0]}
                maximum={healingValueMaximum}
                maximumIsOpenEnded={healingValueBounds[1] > healingValueMaximum}
                range={selectedHealingValueRange}
                scale="logarithmic"
                tooltip={healingValueFilterTooltip}
                onChange={setSelectedHealingValueRange}
              />

              <NumericRangeFilter
                field="cost"
                label="Cost"
                minimum={costBounds[0]}
                maximum={costBounds[1]}
                range={selectedCostRange}
                scale="cost"
                tooltip={costFilterTooltip}
                onChange={setSelectedCostRange}
              />
            </div>
          ) : null}

          <div className="search-filter-panel__actions">
            <button
              className="search-filter-reset-button"
              type="button"
              onClick={resetAdvancedFilters}
            >
              Reset
            </button>
          </div>
        </div>
      ) : null}

      <div className="power-tier-list">
        {powerSections.map((section) => {
          const isClosed = isSectionClosed(section.key);
          const unlockTooltip = sectionUnlockTooltip(section.key);

          return (
            <section className="power-tier" key={section.key}>
              <button
                className="power-tier__toggle"
                aria-expanded={!isClosed}
                onClick={() => toggleSection(section.key)}
                title={unlockTooltip}
              >
                <span>{section.label}</span>
                <span
                  className={
                    isClosed
                      ? "tier-toggle-icon tier-toggle-icon--closed"
                      : "tier-toggle-icon"
                  }
                />
              </button>

              {!isClosed && (
                <div className="power-grid">
                  {section.powers.map((power) => {
                    const canAdd = canAddPower(power);
                    const selected = selectedPowerIds.has(power.power_id);
                    const hasSelectedParentPower =
                      isPowerVariantDevice(power) &&
                      (power.power_dependency ?? []).some((powerId) =>
                        selectedPowerIds.has(powerId),
                      );
                    const highlightedAdvantageIds =
                      getValueFilterAdvantageHighlightIds(power);

                    return (
                      <button
                        className={
                          [
                            "power-choice",
                            selected ? "power-choice--selected" : "",
                            hasSelectedParentPower
                              ? "power-choice--compatible-variant"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")
                        }
                        disabled={!canAdd && !selected}
                        key={power.power_id}
                        onClick={(event) => handlePowerChoiceClick(power, event)}
                      >
                        <SpriteIcon name={getPowerIconName(power)} size={34} />
                        <span
                          className="power-choice__label"
                          data-power-tooltip-lazy={getPowerPanelTooltipId(
                            power.power_id,
                          )}
                          data-power-tooltip-advanced={
                            forceAdvancedPowerTooltip ? "true" : undefined
                          }
                          data-power-tooltip-advantage-queries={
                            advantageHighlightQueries.length > 0
                              ? JSON.stringify(advantageHighlightQueries)
                              : undefined
                          }
                          data-power-tooltip-advantage-ids={
                            highlightedAdvantageIds.length > 0
                              ? JSON.stringify(highlightedAdvantageIds)
                              : undefined
                          }
                          data-power-tooltip-advantage-tag-columns={
                            selectedTagSearchColumns.length > 0
                              ? JSON.stringify(selectedTagSearchColumns)
                              : undefined
                          }
                          title={getPowerTooltipText(power)}
                        >
                          {power.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
      </section>

      {pinnedPowerTooltipWindows}
    </>
  );
}
