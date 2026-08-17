import type { TfPlan } from "./planTypes.js";

export class PlanInputError extends Error {}

const SUGGESTION =
  "Expected `terraform show -json <planfile>` output.\n" +
  "Run:\n" +
  "  terraform plan -out=tfplan && terraform show -json tfplan | terra-ui";

function looksLikePlanJsonLogStream(raw: string): boolean {
  const firstLine = raw.trimStart().split("\n", 1)[0]?.trim();
  if (!firstLine) return false;
  try {
    const parsed = JSON.parse(firstLine);
    return typeof parsed === "object" && parsed !== null && "type" in parsed && "@level" in parsed;
  } catch {
    return false;
  }
}

export function parsePlanInput(raw: string): TfPlan {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new PlanInputError(`No input received.\n\n${SUGGESTION}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    if (looksLikePlanJsonLogStream(trimmed)) {
      throw new PlanInputError(
        `Input looks like \`terraform plan -json\` log output (a stream of UI messages), not a plan.\n` +
          `That format doesn't include attribute-level diffs.\n\n${SUGGESTION}`
      );
    }
    throw new PlanInputError(`Input isn't valid JSON.\n\n${SUGGESTION}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new PlanInputError(`Input isn't a JSON object.\n\n${SUGGESTION}`);
  }

  const plan = parsed as Record<string, unknown>;
  if (typeof plan.format_version !== "string" || (!plan.resource_changes && !plan.output_changes)) {
    throw new PlanInputError(
      `Input doesn't look like \`terraform show -json\` plan output (missing "format_version"/"resource_changes").\n\n${SUGGESTION}`
    );
  }

  return plan as unknown as TfPlan;
}
