import type { OutputEntry } from "./planData.js";
import { formatValue } from "./diff.js";

const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  create: { label: "create", className: "badge-create" },
  update: { label: "update", className: "badge-update" },
  delete: { label: "destroy", className: "badge-delete" },
  replace: { label: "replace", className: "badge-replace" },
  read: { label: "read", className: "badge-read" },
};

export function OutputChanges({ outputs }: { outputs: OutputEntry[] }) {
  if (outputs.length === 0) return null;

  return (
    <div class="outputs-section">
      <h2 class="section-title">Output changes</h2>
      <div class="outputs-list">
        {outputs.map((out) => {
          const badge = ACTION_BADGE[out.actionKind];
          return (
            <div class="output-row" key={out.name}>
              <span class={`badge ${badge.className}`}>{badge.label}</span>
              <span class="output-name">{out.name}</span>
              <span class="attr-values">
                <span class="attr-before">{out.sensitive ? "(sensitive)" : formatValue(out.before)}</span>
                <span class="attr-arrow">→</span>
                <span class="attr-after">{out.sensitive ? "(sensitive)" : formatValue(out.after)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
