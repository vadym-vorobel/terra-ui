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

export interface JsonDiffLine {
  type: "add" | "remove" | "context";
  text: string;
}

// Normalizes a value into an object/array for structural diffing. Handles
// both attributes that are already structured (e.g. a tags map) and ones
// that are JSON-encoded strings (e.g. an aws_iam_policy `policy` attribute) —
// terraform's own plan renderer treats both the same way.
function asJsonContainer(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  if (value !== null && typeof value === "object") return value;
  return undefined;
}

function stringifyContainer(value: unknown): string {
  if (value === undefined) return "";
  const json = JSON.stringify(value, null, 2);
  return json.split(`"${SENSITIVE_MARKER}"`).join("(sensitive value)");
}

// Line-based LCS diff over the pretty-printed JSON. Good enough for plan
// output: a single changed key becomes a remove+add pair, an added array
// element becomes a contiguous block of "+" lines, etc.
function diffLines(before: string[], after: string[]): JsonDiffLine[] {
  const n = before.length;
  const m = after.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        before[i] === after[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const lines: JsonDiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      lines.push({ type: "context", text: before[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({ type: "remove", text: before[i] });
      i++;
    } else {
      lines.push({ type: "add", text: after[j] });
      j++;
    }
  }
  while (i < n) lines.push({ type: "remove", text: before[i++] });
  while (j < m) lines.push({ type: "add", text: after[j++] });
  return lines;
}

// Attempts a structural diff for attribute values that are JSON-shaped
// (objects, arrays, or JSON-encoded strings). Returns undefined when either
// side isn't JSON-shaped, so callers can fall back to plain before/after text.
export function tryDiffJson(before: unknown, after: unknown): JsonDiffLine[] | undefined {
  const beforeOk = before === undefined || asJsonContainer(before) !== undefined;
  const afterOk = after === undefined || asJsonContainer(after) !== undefined;
  if (!beforeOk || !afterOk) return undefined;

  const beforeContainer = asJsonContainer(before);
  const afterContainer = asJsonContainer(after);
  if (beforeContainer === undefined && afterContainer === undefined) return undefined;

  const beforeText = stringifyContainer(beforeContainer);
  const afterText = stringifyContainer(afterContainer);
  if (beforeText === afterText) return undefined;

  return diffLines(beforeText.split("\n"), afterText.split("\n"));
}
