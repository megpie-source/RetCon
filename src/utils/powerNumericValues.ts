export type PowerNumericValueField =
  | "cost"
  | "damage_values"
  | "healing_values";

export type PowerNumericRange = readonly [minimum: number, maximum: number];

type NumericValueRecord = {
  cost?: number | string | null;
  damage_values?: number | string | null;
  healing_values?: number | string | null;
};

function getNumbers(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? [value] : [];
  }

  if (!value) {
    return [];
  }

  return Array.from(
    value.replace(/,/g, ".").matchAll(/\d+(?:\.\d+)?/g),
    (match) => Number(match[0]),
  ).filter(Number.isFinite);
}

function getComparablePowerCost(value: number | string | null | undefined) {
  if (typeof value === "string" && /%\s*HP\b/i.test(value)) {
    return null;
  }

  if (typeof value !== "string") {
    return getNumbers(value)[0] ?? null;
  }

  const primaryExpression = value.split("/")[0] ?? value;
  const primaryNumbers = getNumbers(primaryExpression);

  if (primaryExpression.includes("+")) {
    return primaryNumbers.at(-1) ?? null;
  }

  const values = getNumbers(value);

  return values.length > 0 ? Math.max(...values) : null;
}

export function getPowerNumericValue(
  power: NumericValueRecord,
  field: PowerNumericValueField,
) {
  if (field === "cost") {
    return getComparablePowerCost(power.cost);
  }

  const values = getNumbers(power[field]);

  return values.length > 0 ? Math.max(...values) : null;
}

export function getPowerNumericRangeBounds(
  powers: NumericValueRecord[],
  field: PowerNumericValueField,
  step = 1,
) {
  const values = powers
    .map((power) => getPowerNumericValue(power, field))
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return [0, step] as const;
  }

  return [
    Math.floor(Math.min(...values) / step) * step,
    Math.ceil(Math.max(...values) / step) * step,
  ] as const;
}

export function powerMatchesNumericRange(
  power: NumericValueRecord,
  field: PowerNumericValueField,
  range: PowerNumericRange,
  openEndedMaximum?: number,
) {
  const value = getPowerNumericValue(power, field);
  const matchesMaximum =
    openEndedMaximum !== undefined && range[1] >= openEndedMaximum
      ? true
      : value !== null && value <= range[1];

  return value !== null && value >= range[0] && matchesMaximum;
}
