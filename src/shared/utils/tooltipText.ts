export function formatTooltipLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function cleanTooltipText(tooltip: string | null | undefined) {
  return (
    tooltip
      ?.replace(/<br\s*\/?>/gi, " ")
      .replace(/\s+/g, " ")
      .trim() ?? ""
  );
}

export function cleanMultilineTooltipText(
  tooltip: string | null | undefined,
) {
  const text = tooltip
    ?.replace(/<br\s*\/?>/gi, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();

  return text || null;
}

export function splitTooltipTextLines(text: string | null | undefined) {
  const normalizedText = cleanMultilineTooltipText(text);

  if (!normalizedText) {
    return [];
  }

  return normalizedText
    .split(/\r?\n|(?:^|\s)\+\s+/u)
    .map((line) => line.trim())
    .filter(Boolean);
}
