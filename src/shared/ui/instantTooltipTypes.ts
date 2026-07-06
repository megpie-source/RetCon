import type { PowerTooltipData } from "@/shared/utils/powerTooltip";
import type { FrameworkGlossaryTooltip } from "@/utils/frameworkGlossary";
import type { TagSearchColumn, TooltipTagBadge } from "@/utils/powerTags";

export type StatTooltipData = {
  info: string | null;
  forms: string[];
  primaryEUs: string[];
  secondaryEUs: string[];
};

export type AdvantageTooltipData = {
  name: string;
  pointsCost: number | null;
  tags: TooltipTagBadge[];
  tooltip: string | null;
  lockedReason: string | null;
};

export type TooltipContent =
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "advantage";
      data: AdvantageTooltipData;
    }
  | {
      kind: "power";
      data: PowerTooltipData;
    }
  | {
      kind: "stat";
      data: StatTooltipData;
    }
  | {
      kind: "framework";
      data: FrameworkGlossaryTooltip;
    };

export type TooltipState = {
  advantageHighlightIds: number[];
  advantageHighlightQueries: string[];
  advantageHighlightTagColumns: TagSearchColumn[];
  content: TooltipContent;
  cursorX: number;
  cursorY: number;
  forceAdvancedPowerTooltip: boolean;
  left: number;
  top: number;
  positioned: boolean;
};
