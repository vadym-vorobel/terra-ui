import { formatValue, tryDiffJson } from "./diff.js";

export function ValueDiff({
  before,
  after,
  unknown,
}: {
  before: unknown;
  after: unknown;
  unknown?: boolean;
}) {
  if (unknown) {
    return (
      <div class="attr-values">
        <span class="attr-before">{formatValue(before)}</span>
        <span class="attr-arrow">→</span>
        <span class="attr-after attr-unknown">(known after apply)</span>
      </div>
    );
  }

  const jsonDiff = tryDiffJson(before, after);
  if (jsonDiff) {
    return (
      <pre class="json-diff">
        {jsonDiff.map((line, i) => (
          <div class={`json-diff-line json-diff-${line.type}`} key={i}>
            <span class="json-diff-marker">
              {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
            </span>
            <span class="json-diff-text">{line.text}</span>
          </div>
        ))}
      </pre>
    );
  }

  return (
    <div class="attr-values">
      <span class="attr-before">{formatValue(before)}</span>
      <span class="attr-arrow">→</span>
      <span class="attr-after">{formatValue(after)}</span>
    </div>
  );
}
