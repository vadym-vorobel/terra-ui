import type { ActionKind } from "../planTypes.js";

const ACTIONS: { key: ActionKind; label: string; className: string }[] = [
  { key: "create", label: "Create", className: "badge-create" },
  { key: "update", label: "Update", className: "badge-update" },
  { key: "delete", label: "Destroy", className: "badge-delete" },
  { key: "replace", label: "Replace", className: "badge-replace" },
];

export function Filters({
  search,
  onSearchChange,
  activeActions,
  onToggleAction,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  activeActions: Set<ActionKind>;
  onToggleAction: (action: ActionKind) => void;
}) {
  return (
    <div class="filters">
      <input
        class="search-input"
        type="text"
        placeholder="Filter by resource address or type…"
        value={search}
        onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
      />
      <div class="action-filters">
        {ACTIONS.map(({ key, label, className }) => (
          <button
            key={key}
            type="button"
            class={`action-filter-btn ${className} ${activeActions.has(key) ? "active" : ""}`}
            onClick={() => onToggleAction(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
