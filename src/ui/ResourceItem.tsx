import { useState } from "preact/hooks";
import type { ResourceEntry } from "./planData.js";
import { diffAttributes, formatValue } from "./diff.js";
import { CopyButton } from "./CopyButton.js";

const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  create: { label: "create", className: "badge-create" },
  update: { label: "update", className: "badge-update" },
  delete: { label: "destroy", className: "badge-delete" },
  replace: { label: "replace", className: "badge-replace" },
  read: { label: "read", className: "badge-read" },
};

export function ResourceItem({ entry }: { entry: ResourceEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [showUnchanged, setShowUnchanged] = useState(false);

  const badge = ACTION_BADGE[entry.actionKind];
  const rows = diffAttributes(entry.resourceChange.change);
  const changedRows = rows.filter((r) => r.changed);
  const unchangedCount = rows.length - changedRows.length;
  const visibleRows = showUnchanged ? rows : changedRows;

  return (
    <div class="resource-item">
      <button type="button" class="resource-header" onClick={() => setExpanded((v) => !v)}>
        <span class="expand-caret">{expanded ? "▾" : "▸"}</span>
        <span class={`badge ${badge.className}`}>{badge.label}</span>
        <span class="resource-address-group">
          <span class="resource-address" title={entry.address}>{entry.address}</span>
          <CopyButton text={entry.address} />
        </span>
        <span class="resource-summary-text">
          {changedRows.length} attribute{changedRows.length === 1 ? "" : "s"} changed
        </span>
      </button>

      {expanded && (
        <div class="resource-body">
          {visibleRows.length === 0 && <div class="no-attrs">No attribute changes.</div>}
          {visibleRows.map((row) => (
            <div class={`attr-row ${row.changed ? "attr-changed" : "attr-unchanged"}`} key={row.key}>
              <div class="attr-key">{row.key}</div>
              <div class="attr-values">
                <span class="attr-before">{formatValue(row.before)}</span>
                <span class="attr-arrow">→</span>
                <span class={`attr-after ${row.unknown ? "attr-unknown" : ""}`}>
                  {row.unknown ? "(known after apply)" : formatValue(row.after)}
                </span>
              </div>
            </div>
          ))}

          {unchangedCount > 0 && (
            <button type="button" class="toggle-unchanged" onClick={() => setShowUnchanged((v) => !v)}>
              {showUnchanged ? "Hide" : "Show"} {unchangedCount} unchanged attribute
              {unchangedCount === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
