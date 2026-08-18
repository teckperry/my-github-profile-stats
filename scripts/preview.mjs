// Renders the card with every metric enabled and writes a page to look at it,
// alongside a table of the flag to set for each row. Local tool: pick the rows you
// want here, then set those flags in the workflow.
//
//   STATS_TOKEN=$(gh auth token) STATS_USERNAME=<login> node scripts/preview.mjs
//   open preview/index.html

import { mkdir, readFile, writeFile } from "node:fs/promises";

import { METRICS, effectiveRequirements, envFlag } from "./metrics.mjs";

const OUT_DIR = process.env.PREVIEW_DIR ?? "preview";
await mkdir(OUT_DIR, { recursive: true });

process.env.SHOW_ALL = "true";
process.env.CARD_OUTPUT = `${OUT_DIR}/card.svg`;
process.env.CARD_SUMMARY = `${OUT_DIR}/values.json`;
await import("./generate-card.mjs");

const svg = await readFile(process.env.CARD_OUTPUT, "utf8");
const values = JSON.parse(await readFile(process.env.CARD_SUMMARY, "utf8"));

const rows = METRICS.filter((m) => m.key in values)
  .map((m) => {
    const needs = effectiveRequirements(m);
    return `<tr>
      <td><code>${envFlag(m.key)}</code></td>
      <td>${m.label}</td>
      <td class="num">${values[m.key]}</td>
      <td class="dim">${needs.length ? needs.map((s) => `<code>${s}</code>`).join(" + ") : "—"}</td>
    </tr>`;
  })
  .join("\n");

const dropped = METRICS.filter((m) => !(m.key in values))
  .map((m) => `<li><code>${envFlag(m.key)}</code> — ${m.label}</li>`)
  .join("\n");

await writeFile(
  `${OUT_DIR}/index.html`,
  `<!doctype html>
<meta charset="utf-8">
<title>Stats card preview</title>
<style>
  :root { color-scheme: dark; }
  body { background: #0d1117; color: #c9d1d9; font: 15px/1.6 -apple-system, "Segoe UI", sans-serif; margin: 0; padding: 40px; }
  main { max-width: 900px; margin: 0 auto; }
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 4px; }
  p.lede { color: #8b949e; margin: 0 0 32px; }
  .card { margin-bottom: 40px; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { text-align: left; padding: 7px 12px; border-bottom: 1px solid #21262d; }
  th { color: #8b949e; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  code { font: 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace; background: #161b22; padding: 2px 5px; border-radius: 4px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; color: #e6edf3; }
  .dim { color: #8b949e; }
  h2 { font-size: 14px; color: #8b949e; margin: 32px 0 8px; font-weight: 600; }
  ul { color: #8b949e; font-size: 14px; padding-left: 20px; }
</style>
<main>
  <h1>Stats card preview</h1>
  <p class="lede">Every metric enabled. Pick the rows you want, then set those flags in the workflow.</p>
  <div class="card">${svg}</div>
  <table>
    <thead><tr><th>Flag</th><th>Row</th><th>Value</th><th>Needs</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
  ${dropped ? `<h2>Dropped — the token cannot support these</h2><ul>${dropped}</ul>` : ""}
</main>
`,
  "utf8",
);

console.log(`Preview: ${OUT_DIR}/index.html`);
