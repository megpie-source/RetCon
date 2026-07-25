import type { PowerTooltipData } from "@/shared/utils/powerTooltip";
import type { FrameworkGlossaryTooltip } from "@/utils/frameworkGlossary";
import type {
  AdvantageTooltipData,
  StatTooltipData,
  TooltipContent,
} from "@/shared/ui/instantTooltipTypes";
import type { TagSearchColumn } from "@/utils/powerTags";

export const instantTooltipAttributeFilter = [
  "data-power-tooltip",
  "data-power-tooltip-lazy",
  "data-power-tooltip-advantage-queries",
  "data-power-tooltip-advantage-ids",
  "data-power-tooltip-advantage-tag-columns",
  "data-power-tooltip-advanced",
  "data-advantage-tooltip",
  "data-stat-tooltip",
  "data-framework-tooltip",
  "data-text-tooltip",
  "title",
];

type LazyTooltipProvider = () => TooltipContent | null;

const lazyTooltipProviders = new Map<string, LazyTooltipProvider>();

export function registerLazyTooltipProvider(
  id: string,
  provider: LazyTooltipProvider,
) {
  lazyTooltipProviders.set(id, provider);
}

export function unregisterLazyTooltipProvider(id: string) {
  lazyTooltipProviders.delete(id);
}

export function getTooltipElement(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  if (
    target.closest("[data-no-instant-tooltip]") &&
    !target.closest("[data-allow-instant-tooltip]")
  ) {
    return null;
  }

  const element = target.closest<HTMLElement>(
    "[title], [data-advantage-tooltip], [data-power-tooltip], [data-power-tooltip-lazy], [data-stat-tooltip], [data-framework-tooltip], [data-text-tooltip]",
  );

  if (!element) {
    return null;
  }

  if (
    !element.title.trim() &&
    !element.dataset.advantageTooltip &&
    !element.dataset.powerTooltip &&
    !element.dataset.powerTooltipLazy &&
    !element.dataset.statTooltip &&
    !element.dataset.frameworkTooltip &&
    !element.dataset.textTooltip
  ) {
    return null;
  }

  return element;
}

export function releaseTooltipElement(element: HTMLElement | null) {
  if (!element) {
    return;
  }

  const storedTitle = element.dataset.instantTooltipTitle;

  if (storedTitle !== undefined) {
    if (!element.title.trim()) {
      element.title = storedTitle;
    }

    delete element.dataset.instantTooltipTitle;
  }
}

export function shouldForceAdvancedPowerTooltip(element: HTMLElement) {
  return element.dataset.powerTooltipAdvanced === "true";
}

export function getAdvantageHighlightQueries(element: HTMLElement) {
  const rawQueries = element.dataset.powerTooltipAdvantageQueries;

  if (!rawQueries) {
    return [];
  }

  try {
    const queries = JSON.parse(rawQueries);

    return Array.isArray(queries)
      ? queries.filter((query): query is string => typeof query === "string")
      : [];
  } catch {
    return [];
  }
}

export function getAdvantageHighlightIds(element: HTMLElement) {
  const rawIds = element.dataset.powerTooltipAdvantageIds;

  if (!rawIds) {
    return [];
  }

  try {
    const ids = JSON.parse(rawIds);

    return Array.isArray(ids)
      ? ids.filter((id): id is number => typeof id === "number")
      : [];
  } catch {
    return [];
  }
}

export function getAdvantageHighlightTagColumns(element: HTMLElement) {
  const rawColumns = element.dataset.powerTooltipAdvantageTagColumns;

  if (!rawColumns) {
    return [];
  }

  try {
    const columns = JSON.parse(rawColumns);
    const allowedColumns = new Set(["apply", "refresh", "synergy"]);

    return Array.isArray(columns)
      ? columns.filter(
          (column): column is TagSearchColumn =>
            typeof column === "string" && allowedColumns.has(column),
        )
      : [];
  } catch {
    return [];
  }
}

export function getTooltipContent(element: HTMLElement): TooltipContent | null {
  if (element.dataset.advantageTooltip) {
    try {
      return {
        kind: "advantage",
        data: JSON.parse(
          element.dataset.advantageTooltip,
        ) as AdvantageTooltipData,
      };
    } catch {
      // Fall back to the plain title when a malformed dataset slips through.
    }
  }

  if (element.dataset.powerTooltip) {
    try {
      return {
        kind: "power",
        data: JSON.parse(element.dataset.powerTooltip) as PowerTooltipData,
      };
    } catch {
      // Fall back to the plain title when a malformed dataset slips through.
    }
  }

  if (element.dataset.powerTooltipLazy) {
    const lazyTooltip = lazyTooltipProviders.get(
      element.dataset.powerTooltipLazy,
    )?.();

    if (lazyTooltip) {
      return lazyTooltip;
    }
  }

  if (element.dataset.statTooltip) {
    try {
      return {
        kind: "stat",
        data: JSON.parse(element.dataset.statTooltip) as StatTooltipData,
      };
    } catch {
      // Fall back to the plain title when a malformed dataset slips through.
    }
  }

  if (element.dataset.frameworkTooltip) {
    try {
      return {
        kind: "framework",
        data: JSON.parse(
          element.dataset.frameworkTooltip,
        ) as FrameworkGlossaryTooltip,
      };
    } catch {
      // Fall back to the plain title when a malformed dataset slips through.
    }
  }

  const text =
    element.dataset.textTooltip?.trim() ||
    element.title.trim() ||
    element.dataset.instantTooltipTitle?.trim() ||
    "";

  return text ? { kind: "text", text } : null;
}
