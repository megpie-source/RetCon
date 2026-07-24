import type { Power } from "@/types/powers";

export const powerActivationTypeOptions = [
  "Blast",
  "Charge",
  "Click",
  "Combo",
  "Maintain",
  "Toggle",
  "Passive",
] as const;

export type PowerActivationTypeFilter =
  (typeof powerActivationTypeOptions)[number];

function normalizeActivationType(value: string | null | undefined) {
  return value?.replace(/[_-]+/g, " ").trim().toLowerCase() ?? "";
}

function getPowerActivationTypeParts(power: Power) {
  return normalizeActivationType(power.activation_type)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function powerMatchesActivationTypeFilter(
  power: Power,
  activationTypeFilter: PowerActivationTypeFilter | "",
) {
  if (activationTypeFilter === "") {
    return true;
  }

  const expectedActivationType = normalizeActivationType(activationTypeFilter);
  const powerActivationTypes = getPowerActivationTypeParts(power);

  if (expectedActivationType === "charge") {
    return (
      powerActivationTypes.includes("charge") ||
      powerActivationTypes.includes("full charge")
    );
  }

  return powerActivationTypes.includes(expectedActivationType);
}
