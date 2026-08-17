import type { TfChange } from "../planTypes.js";

export interface AttributeRow {
  key: string;
  before: unknown;
  after: unknown;
  sensitive: boolean;
  unknown: boolean;
  changed: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// The *_sensitive fields mirror the shape of the value itself: for a
// collection/map attribute, sensitivity is marked per-element rather than as
// a single boolean, so `{}` (no sensitive elements) is a plain object and
// must not be treated as truthy on its own.
export function isSensitive(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.some(isSensitive);
  if (value && typeof value === "object") {
    return Object.values(value).some(isSensitive);
  }
  return false;
}

export function diffAttributes(change: TfChange): AttributeRow[] {
  const before = asRecord(change.before);
  const after = asRecord(change.after);
  const beforeSensitive = asRecord(change.before_sensitive);
  const afterSensitive = asRecord(change.after_sensitive);
  const afterUnknown = asRecord(change.after_unknown);

  const keys = new Set<string>([
    ...Object.keys(before),
    ...Object.keys(after),
    ...Object.keys(afterUnknown),
  ]);

  const rows: AttributeRow[] = [];
  for (const key of keys) {
    const b = before[key];
    const a = after[key];
    const sensitive = isSensitive(beforeSensitive[key]) || isSensitive(afterSensitive[key]);
    const unknown = Boolean(afterUnknown[key]);
    const changed = unknown || JSON.stringify(b) !== JSON.stringify(a);
    rows.push({ key, before: b, after: a, sensitive, unknown, changed });
  }

  rows.sort((x, y) => x.key.localeCompare(y.key));
  return rows;
}

export function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}
