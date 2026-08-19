import type { TfChange } from "../planTypes.js";

export interface AttributeRow {
  key: string;
  before: unknown;
  after: unknown;
  unknown: boolean;
  changed: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// Marker substituted for values whose corresponding *_sensitive entry is
// `true`. Kept as a unique string so JSON.stringify quotes it like any other
// string leaf; formatValue then strips the surrounding quotes so it reads as
// `(sensitive value)` the way `terraform plan` prints it, rather than
// collapsing the whole (possibly partially-sensitive) attribute.
const SENSITIVE_MARKER = "__TF_SENSITIVE_MARKER__";

// Walks `value` alongside its matching *_sensitive tree (same shape, per the
// terraform-json format) and replaces only the leaves marked sensitive,
// leaving sibling keys/elements untouched.
export function redactSensitive(value: unknown, sensitive: unknown): unknown {
  if (sensitive === true) return SENSITIVE_MARKER;
  if (Array.isArray(value)) {
    const sArr = Array.isArray(sensitive) ? sensitive : [];
    return value.map((v, i) => redactSensitive(v, sArr[i]));
  }
  if (value && typeof value === "object") {
    const sObj =
      sensitive && typeof sensitive === "object" && !Array.isArray(sensitive)
        ? (sensitive as Record<string, unknown>)
        : {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactSensitive(v, (sObj as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
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
    const unknown = Boolean(afterUnknown[key]);
    const changed = unknown || JSON.stringify(b) !== JSON.stringify(a);
    rows.push({
      key,
      before: redactSensitive(b, beforeSensitive[key]),
      after: redactSensitive(a, afterSensitive[key]),
      unknown,
      changed,
    });
  }

  rows.sort((x, y) => x.key.localeCompare(y.key));
  return rows;
}

export function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (value === SENSITIVE_MARKER) return "(sensitive value)";
  if (typeof value === "string") return value;
  const json = JSON.stringify(value, null, 2);
  return json.split(`"${SENSITIVE_MARKER}"`).join("(sensitive value)");
}
