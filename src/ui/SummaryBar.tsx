import type { PlanSummary } from "./planData.js";

const LABELS: { key: keyof PlanSummary; label: string; className: string }[] = [
  { key: "create", label: "to add", className: "badge-create" },
  { key: "update", label: "to change", className: "badge-update" },
  { key: "delete", label: "to destroy", className: "badge-delete" },
  { key: "replace", label: "to replace", className: "badge-replace" },
];

export function SummaryBar({ summary }: { summary: PlanSummary }) {
  return (
    <div class="summary-bar">
      {LABELS.map(({ key, label, className }) => (
        <div class={`summary-item ${className}`} key={key}>
          <span class="summary-count">{summary[key]}</span>
          <span class="summary-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
