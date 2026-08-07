import type { GearItem } from "@/types/gear";
import {
  cleanMultilineTooltipText,
  replaceTooltipBulletMarkersWithLineBreaks,
} from "@/shared/utils/tooltipText";
import {
  formatBonusSegment,
  getGearBonusValue,
} from "./gearBonusFormatting";
import { getDisplayedSetBonusTiers } from "./gearSetBonuses";

function cleanGearTooltipText(value: string | null | undefined) {
  return (
    replaceTooltipBulletMarkersWithLineBreaks(cleanMultilineTooltipText(value))
      ?.trim() ?? null
  );
}

function getGearBonusLines(gear: GearItem) {
  return gear.bonuses.flatMap(
    (bonus) => formatBonusSegment(bonus, getGearBonusValue(bonus)) ?? [],
  );
}

function getTextLines(values: string[] | null | undefined) {
  return (values ?? [])
    .map((value) => cleanGearTooltipText(value))
    .filter((value): value is string => Boolean(value));
}

function getSetBonusText(gear: GearItem) {
  const setBonusTiers = getDisplayedSetBonusTiers(gear);

  if (setBonusTiers.length === 0) {
    return null;
  }

  const uniqueLines = new Set<string>();

  setBonusTiers.forEach((setBonusTier) => {
    const bonusLines = setBonusTier.bonuses.flatMap(
      (bonus) => formatBonusSegment(bonus, getGearBonusValue(bonus)) ?? [],
    );
    const textLines = getTextLines(setBonusTier.text);
    const tierLines = [...bonusLines, ...textLines];

    tierLines.forEach((line) =>
      uniqueLines.add(`${setBonusTier.pieces} pieces: ${line}`),
    );
  });

  const lines = Array.from(uniqueLines);

  return lines.length > 0 ? ["Set Bonus:", ...lines].join("\n") : null;
}

function getPieceBonusText(gear: GearItem) {
  const lines = [
    ...getGearBonusLines(gear),
    ...getTextLines(gear.bonus_text),
    cleanGearTooltipText(gear.gear_tooltip),
    cleanGearTooltipText(gear.set_tooltip),
    ...getTextLines(gear.set_piece_bonus_text),
  ].filter((line): line is string => Boolean(line));

  return lines.length > 0 ? ["Piece Bonus:", ...lines].join("\n") : null;
}

export function getGearTooltipText(gear: GearItem | null | undefined) {
  if (!gear) {
    return null;
  }

  const lines = [
    getSetBonusText(gear),
    getPieceBonusText(gear),
    gear.source.length > 0 ? `Source: ${gear.source.join(", ")}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}
