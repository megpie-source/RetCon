import type { SuperStat } from "@/types/character";

export function getStatTooltipAttribute(stat: SuperStat) {
  return JSON.stringify({
    info: stat.info,
    forms: stat.forms ?? [],
    primaryEUs: stat.primaryEUs ?? [],
    secondaryEUs: stat.secondaryEUs ?? [],
  });
}
