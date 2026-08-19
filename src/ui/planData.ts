import type { ActionKind, TfPlan, TfResourceChange } from "../planTypes.js";
import { toActionKind } from "../planTypes.js";
import { redactSensitive } from "./diff.js";

export interface ResourceEntry {
  address: string;
  actionKind: ActionKind;
  resourceChange: TfResourceChange;
}

export interface OutputEntry {
  name: string;
  actionKind: ActionKind;
  before: unknown;
  after: unknown;
}

export interface PlanSummary {
  create: number;
  update: number;
  delete: number;
  replace: number;
}

export function buildResourceEntries(plan: TfPlan): ResourceEntry[] {
  return (plan.resource_changes ?? [])
    .map((rc) => ({
      address: rc.address,
      actionKind: toActionKind(rc.change.actions),
      resourceChange: rc,
    }))
    .filter((entry) => entry.actionKind !== "no-op");
}

export function buildOutputEntries(plan: TfPlan): OutputEntry[] {
  return Object.entries(plan.output_changes ?? {})
    .map(([name, change]) => ({
      name,
      actionKind: toActionKind(change.actions),
      before: redactSensitive(change.before, change.before_sensitive),
      after: redactSensitive(change.after, change.after_sensitive),
    }))
    .filter((entry) => entry.actionKind !== "no-op");
}

export function summarize(entries: ResourceEntry[]): PlanSummary {
  const summary: PlanSummary = { create: 0, update: 0, delete: 0, replace: 0 };
  for (const entry of entries) {
    if (entry.actionKind in summary) {
      summary[entry.actionKind as keyof PlanSummary]++;
    }
  }
  return summary;
}
