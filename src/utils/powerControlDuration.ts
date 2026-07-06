export type PowerControlDurationFilter = number | "under-1" | "14+" | null;
export type PowerControlType =
  | "Confuse"
  | "Incapacitate"
  | "Paralyze"
  | "Root"
  | "Sleep"
  | "Stun";

type ControlDurationRecord = {
  control_values?: number | string | null;
};

function normalizeControlType(value: string): PowerControlType | null {
  const normalized = value.trim().toLowerCase();

  if (normalized.startsWith("stun")) return "Stun";
  if (normalized.startsWith("paraly")) return "Paralyze";
  if (normalized.startsWith("root")) return "Root";
  if (normalized.startsWith("sleep")) return "Sleep";
  if (normalized.startsWith("confus")) return "Confuse";
  if (normalized.startsWith("incapacitat")) return "Incapacitate";

  return null;
}

function getPowerControlEntries(power: ControlDurationRecord) {
  const value = power.control_values;

  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0
      ? [{ duration: value, type: null }]
      : [];
  }

  return value.split(";").flatMap((entry) => {
    const match = entry
      .replace(/,/g, ".")
      .match(/^\s*([^=]+?)\s*=\s*(\d+(?:\.\d+)?)\s*$/);

    if (!match) {
      return [];
    }

    const duration = Number(match[2]);

    return Number.isFinite(duration) && duration > 0
      ? [{ duration, type: normalizeControlType(match[1] ?? "") }]
      : [];
  });
}

export function getPowerControlDurations(
  power: ControlDurationRecord,
  controlTypes: PowerControlType[] = [],
) {
  const entries = getPowerControlEntries(power);

  return entries
    .filter(
      (entry) =>
        controlTypes.length === 0 ||
        (entry.type !== null && controlTypes.includes(entry.type)),
    )
    .map((entry) => entry.duration);
}

export function getControlTypesFromSearch(search: string) {
  const types = new Set<PowerControlType>();

  if (/\bstun(?:s|ned|ning)?\b/i.test(search)) types.add("Stun");
  if (/\bparaly(?:ze[sd]?|zed|zing|sis)\b/i.test(search)) {
    types.add("Paralyze");
  }
  if (/\broot(?:s|ed|ing)?\b/i.test(search)) types.add("Root");
  if (/\b(?:sleep(?:s|ing)?|slept)\b/i.test(search)) types.add("Sleep");
  if (/\bconfus(?:e[sd]?|ed|ing|ion)\b/i.test(search)) types.add("Confuse");
  if (/\bincapacitat(?:e[sd]?|ed|ing|ion)\b/i.test(search)) {
    types.add("Incapacitate");
  }

  if (/\b(?:hold|holds|held)\b/i.test(search)) {
    types.add("Stun");
    types.add("Paralyze");
    types.add("Sleep");
  }

  return [...types];
}

export function getPowerControlDurationSteps(powers: ControlDurationRecord[]) {
  const durations = powers.flatMap((power) => getPowerControlDurations(power));
  const exactDurations = Array.from(
    new Set(durations.filter((duration) => duration >= 1 && duration <= 14)),
  ).sort((a, b) => a - b);

  return [
    null,
    ...(durations.some((duration) => duration < 1)
      ? (["under-1"] as const)
      : []),
    ...exactDurations,
    ...(durations.some((duration) => duration > 14)
      ? (["14+"] as const)
      : []),
  ];
}

export function formatPowerControlDurationLabel(
  duration: PowerControlDurationFilter,
) {
  if (duration === null) {
    return "Any CC duration";
  }

  if (duration === "under-1") {
    return "<1 sec";
  }

  if (duration === "14+") {
    return "14+ sec";
  }

  return `${duration} sec`;
}

export function powerMatchesControlDuration(
  power: ControlDurationRecord,
  expectedDuration: Exclude<PowerControlDurationFilter, null>,
  controlTypes: PowerControlType[] = [],
) {
  const durations = getPowerControlDurations(power, controlTypes);

  if (expectedDuration === "under-1") {
    return durations.some((duration) => duration < 1);
  }

  if (expectedDuration === "14+") {
    return durations.some((duration) => duration > 14);
  }

  return durations.includes(expectedDuration);
}
