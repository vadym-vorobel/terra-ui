import { useMemo, useState } from "preact/hooks";
import type { ActionKind, TfPlan } from "../planTypes.js";
import { buildOutputEntries, buildResourceEntries, summarize } from "./planData.js";
import { SummaryBar } from "./SummaryBar.js";
import { Filters } from "./Filters.js";
import { ResourceItem } from "./ResourceItem.js";
import { OutputChanges } from "./OutputChanges.js";
import { EmptyState } from "./EmptyState.js";

const ALL_ACTIONS: ActionKind[] = ["create", "update", "delete", "replace", "read"];

export function App({ plan }: { plan: TfPlan }) {
  const resourceEntries = useMemo(() => buildResourceEntries(plan), [plan]);
  const outputEntries = useMemo(() => buildOutputEntries(plan), [plan]);
  const summary = useMemo(() => summarize(resourceEntries), [resourceEntries]);

  const [search, setSearch] = useState("");
  const [activeActions, setActiveActions] = useState<Set<ActionKind>>(new Set(ALL_ACTIONS));

  const toggleAction = (action: ActionKind) => {
    setActiveActions((prev) => {
      const next = new Set(prev);
      if (next.has(action)) {
        next.delete(action);
      } else {
        next.add(action);
      }
      // Empty selection reads as "no filter" rather than "show nothing".
      return next.size === 0 ? new Set(ALL_ACTIONS) : next;
    });
  };

  const filtered = resourceEntries.filter((entry) => {
    if (!activeActions.has(entry.actionKind)) return false;
    if (!search.trim()) return true;
    const needle = search.trim().toLowerCase();
    return (
      entry.address.toLowerCase().includes(needle) ||
      entry.resourceChange.type.toLowerCase().includes(needle)
    );
  });

  if (resourceEntries.length === 0 && outputEntries.length === 0) {
    return <EmptyState />;
  }

  return (
    <div class="app">
      <SummaryBar summary={summary} />
      <Filters
        search={search}
        onSearchChange={setSearch}
        activeActions={activeActions}
        onToggleAction={toggleAction}
      />
      <div class="resource-list">
        {filtered.length === 0 && <div class="no-results">No resources match the current filters.</div>}
        {filtered.map((entry) => (
          <ResourceItem entry={entry} key={entry.address} />
        ))}
      </div>
      <OutputChanges outputs={outputEntries} />
    </div>
  );
}
