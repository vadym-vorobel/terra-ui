// Shape of `terraform show -json <planfile>` output.
// Reference: https://developer.hashicorp.com/terraform/internals/json-format

export type TfAction = "no-op" | "create" | "read" | "update" | "delete";

export interface TfChange {
  actions: TfAction[];
  before: unknown;
  after: unknown;
  after_unknown: unknown;
  before_sensitive: unknown;
  after_sensitive: unknown;
}

export interface TfResourceChange {
  address: string;
  module_address?: string;
  mode: "managed" | "data";
  type: string;
  name: string;
  index?: string | number;
  deposed?: string;
  change: TfChange;
  action_reason?: string;
}

// Unlike resource_changes entries, output_changes values ARE the Change
// object directly (actions/before/after/... at the top level) — no nested
// "change" wrapper. See hashicorp/terraform-json's Plan.OutputChanges
// (map[string]*Change).
export interface TfPlan {
  format_version: string;
  terraform_version?: string;
  resource_changes?: TfResourceChange[];
  output_changes?: Record<string, TfChange>;
}

// The action kind we actually render, after collapsing raw `actions` arrays
// (e.g. ["delete","create"] / ["create","delete"] -> "replace").
export type ActionKind = "create" | "update" | "delete" | "replace" | "no-op" | "read";

export function toActionKind(actions: TfAction[]): ActionKind {
  const set = new Set(actions);
  if (set.has("create") && set.has("delete")) return "replace";
  if (set.has("create")) return "create";
  if (set.has("delete")) return "delete";
  if (set.has("update")) return "update";
  if (set.has("read")) return "read";
  return "no-op";
}
