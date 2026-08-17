import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });

// 1. Bundle the Preact UI for the browser.
const uiResult = await build({
  entryPoints: [join(root, "src/ui/main.tsx")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  minify: true,
  write: false,
});
const uiBundle = uiResult.outputFiles[0].text;

// 2. Inline the UI bundle + CSS into the HTML template.
// (The plan-data placeholder is left for the CLI to fill in per invocation.)
const css = readFileSync(join(root, "src/ui/styles.css"), "utf8");
const templateSrc = readFileSync(join(root, "src/template.html"), "utf8");
const template = templateSrc
  .replace("__TERRA_UI_CSS__", () => css)
  .replace("__TERRA_UI_BUNDLE__", () => uiBundle);
writeFileSync(join(dist, "template.html"), template, "utf8");

// 3. Bundle the Node CLI.
await build({
  entryPoints: [join(root, "src/cli.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node18",
  outfile: join(dist, "cli.js"),
  banner: { js: "#!/usr/bin/env node" },
  external: ["open"],
});

console.log("Built dist/cli.js and dist/template.html");
