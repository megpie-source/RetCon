export type PowerNumericValueField =
  | "total_duration"
  | "activation_time"
  | "cost"
  | "damage_values"
  | "healing_values"
  | "max_duration";

export type PowerNumericRange = readonly [minimum: number, maximum: number];

type NumericValueRecord = {
  activation_time?: number | string | null;
  cost?: number | string | null;
  damage_values?: number | string | null;
  healing_values?: number | string | null;
  max_duration?: number | string | null;
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
  if (field === "total_duration") {
    const activationValues = getNumbers(power.activation_time);
    const durationValues = getNumbers(power.max_duration);
    const activationTime =
      activationValues.length > 0 ? Math.max(...activationValues) : 0;
    const maxDuration =
      durationValues.length > 0 ? Math.max(...durationValues) : 0;

    return activationTime > 0 || maxDuration > 0
      ? activationTime + maxDuration
      : null;
  }

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

  const minimum = Math.floor(Math.min(...values) / step) * step;
  const maximum = Math.ceil(Math.max(...values) / step) * step;

  return [
    minimum,
    maximum > minimum ? maximum : minimum + step,
  ] as const;
}

export function getPowerNumericFilterSteps(
  powers: NumericValueRecord[],
  field: PowerNumericValueField,
  step = 1,
) {
  const values = powers
    .map((power) => getPowerNumericValue(power, field))
    .filter((value): value is number => value !== null)
    .map((value) => Math.round(value / step) * step);

  return [
    null,
    ...Array.from(new Set(values)).sort((a, b) => a - b),
  ] as const;
}

export function formatPowerNumericFilterLabel(
  value: number | null,
  anyLabel: string,
  unit = "",
  decimalPlaces?: number,
) {
  if (value === null) {
    return anyLabel;
  }

  const formattedValue =
    decimalPlaces === undefined
      ? Number.isInteger(value)
        ? String(value)
        : value.toFixed(1).replace(/\.?0+$/u, "")
      : value.toFixed(decimalPlaces);

  return `${formattedValue}${unit}`;
}

export function powerMatchesNumericValue(
  power: NumericValueRecord,
  field: PowerNumericValueField,
  expectedValue: number | null,
  tolerance = 0.01,
) {
  if (expectedValue === null) {
    return true;
  }

  const value = getPowerNumericValue(power, field);

  return value !== null && Math.abs(value - expectedValue) <= tolerance;
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
