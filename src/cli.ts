import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import open from "open";
import { parsePlanInput, PlanInputError } from "./planParser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function readInput(filePath: string | undefined): Promise<string> {
  if (filePath) {
    return Promise.resolve(readFileSync(filePath, "utf8"));
  }
  return readStdin();
}

function embedJson(plan: unknown): string {
  // Escape `</script>` and similar so the embedded JSON can't break out of
  // the surrounding <script> tag.
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
  // Use a replacer function, not a string: a string replacement runs through
  // String.replace's special-pattern handling ($&, $`, $', $$, ...), and
  // Terraform plan data (e.g. API Gateway VTL templates) is full of
  // `$`-prefixed text that can accidentally match those patterns.
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
