#!/usr/bin/env node

// src/cli.ts
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import open from "open";

// src/planParser.ts
var PlanInputError = class extends Error {
};
var SUGGESTION = "Expected `terraform show -json <planfile>` output.\nRun:\n  terraform plan -out=tfplan && terraform show -json tfplan | terra-ui";
function looksLikePlanJsonLogStream(raw) {
  const firstLine = raw.trimStart().split("\n", 1)[0]?.trim();
  if (!firstLine) return false;
  try {
    const parsed = JSON.parse(firstLine);
    return typeof parsed === "object" && parsed !== null && "type" in parsed && "@level" in parsed;
  } catch {
    return false;
  }
}
function parsePlanInput(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new PlanInputError(`No input received.

${SUGGESTION}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    if (looksLikePlanJsonLogStream(trimmed)) {
      throw new PlanInputError(
        `Input looks like \`terraform plan -json\` log output (a stream of UI messages), not a plan.
That format doesn't include attribute-level diffs.

${SUGGESTION}`
      );
    }
    throw new PlanInputError(`Input isn't valid JSON.

${SUGGESTION}`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new PlanInputError(`Input isn't a JSON object.

${SUGGESTION}`);
  }
  const plan = parsed;
  if (typeof plan.format_version !== "string" || !plan.resource_changes && !plan.output_changes) {
    throw new PlanInputError(
      `Input doesn't look like \`terraform show -json\` plan output (missing "format_version"/"resource_changes").

${SUGGESTION}`
    );
  }
  return plan;
}

// src/cli.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
function readInput(filePath) {
  if (filePath) {
    return Promise.resolve(readFileSync(filePath, "utf8"));
  }
  return readStdin();
}
function embedJson(plan) {
  return JSON.stringify(plan).replace(/</g, "\\u003c");
}
async function main() {
  const filePath = process.argv[2];
  const raw = await readInput(filePath);
  let plan;
  try {
    plan = parsePlanInput(raw);
  } catch (err) {
    if (err instanceof PlanInputError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
  const template = readFileSync(join(__dirname, "template.html"), "utf8");
  const html = template.replace("__TERRA_UI_PLAN_JSON__", () => embedJson(plan));
  const outPath = join(tmpdir(), `terra-ui-${Date.now()}.html`);
  writeFileSync(outPath, html, "utf8");
  console.error(outPath);
  await open(outPath);
}
main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
