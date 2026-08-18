// Renders the languages card. Separate from the stats card because it answers a
// different question from a different source, and because a reader should be able to
// take one without the other.
//
// Env:
//   STATS_TOKEN                        token used to read the pull requests
//   STATS_USERNAME                     GitHub login to render
//   LANGUAGES_OUTPUT                   path to write the SVG to
//   CARD_THEME / CARD_ACCENT           as the stats card
//   PRS_NUMBER_TO_CALCULATE_LANGUAGES  "all" (default) or how many recent PRs to read
//   EXCLUDED_LANGUAGES                 comma-separated names to leave out
//   MANUAL_LANGUAGES                   "Terraform 54, TypeScript 21" -- declared, no requests

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { configure, graphql, httpLog } from "./github.mjs";
import { composeCard } from "./layouts.mjs";
import { measureLanguages, parseManual, shareOut } from "./languages.mjs";
import { THEMES, ensureReadable } from "./theme.mjs";
import { buildTheme } from "./theme.mjs";

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
};

const TOKEN = requireEnv("STATS_TOKEN");
const USERNAME = requireEnv("STATS_USERNAME");
const OUTPUT = requireEnv("LANGUAGES_OUTPUT");

configure({ token: TOKEN, username: USERNAME });

const THEME = buildTheme(process.env.CARD_THEME || "dark", process.env.CARD_ACCENT);

const LAYOUT = {
  width: 467,
  pad: 22,
  legendRow: 21,
  legendCols: 2,
  dot: 8,
  gapBeforeNote: 16,
};

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const pct = (share) => `${share.toFixed(1)}%`;

// Language colours are GitHub's, which is what makes the bar recognisable, but they
// were never chosen against a dark surface: JSON is #292929, which on #0d1117 reads as
// a hole in the bar rather than a segment. Each one goes through the same contrast
// correction as the accent, per surface, and is emitted as a variable so one card can
// carry both sets.
function paletteCss(segments) {
  const themeName = process.env.CARD_THEME || "dark";
  const forSurface = (bg) =>
    segments
      .map((s, i) => `      --lang-${i}: ${ensureReadable(s.color, bg).hex};`)
      .join("\n");

  if (themeName === "auto") {
    return `    :root {\n${forSurface(THEMES.light.bg)}\n    }
    @media (prefers-color-scheme: dark) {
      :root {\n${forSurface(THEMES.dark.bg)}\n      }
    }`;
  }
  return `    :root {\n${forSurface(THEMES[themeName].bg)}\n    }`;
}

function render(segments, note) {
  const inner = LAYOUT.width - LAYOUT.pad * 2;
  const rows = Math.ceil(segments.length / LAYOUT.legendCols);
  const colWidth = inner / LAYOUT.legendCols;
  const noteTop = rows * LAYOUT.legendRow + LAYOUT.gapBeforeNote;
  const height = LAYOUT.pad * 2 + noteTop + (note ? 4 : -LAYOUT.gapBeforeNote);

  // Every segment is named and given its share, so identity never rests on colour
  // alone -- which is also what makes borrowing GitHub's palette defensible.
  const legend = segments
    .map((s, i) => {
      const col = i % LAYOUT.legendCols;
      const row = Math.floor(i / LAYOUT.legendCols);
      const cx = col * colWidth;
      return `      <g class="entry" style="animation-delay: ${120 + i * 70}ms" transform="translate(${cx.toFixed(1)}, ${row * LAYOUT.legendRow})">
        <circle cx="${LAYOUT.dot / 2}" cy="7.5" r="${LAYOUT.dot / 2}" fill="var(--lang-${i})"/>
        <text class="name" x="${LAYOUT.dot + 8}" y="11">${escape(s.name)}</text>
        <text class="share" x="${(colWidth - 12).toFixed(1)}" y="11" text-anchor="end">${pct(s.share)}</text>
      </g>`;
    })
    .join("\n");

  return composeCard({
    width: LAYOUT.width,
    height: Math.ceil(height),
    theme: THEME,
    title: `${USERNAME}'s languages`,
    desc: segments.map((s) => `${s.name}: ${pct(s.share)}`).join(", ") + (note ? `. ${note}` : ""),
    style: `${THEME.css}
${paletteCss(segments)}
    .name { font: 600 12.5px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif; fill: ${THEME.strong}; }
    .share { font: 400 12.5px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif; fill: ${THEME.text}; }
    .note { font: 400 10.5px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.dim}; }
    .entry, .note { opacity: 0; animation: fadeIn .3s ease-out forwards; }
    .note { animation-delay: ${200 + segments.length * 70}ms; }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`,
    body: `  <g transform="translate(${LAYOUT.pad}, ${LAYOUT.pad})">
    <g>
${legend}
    </g>${note ? `\n    <text class="note" x="0" y="${noteTop}">${escape(note)}</text>` : ""}
  </g>`,
  });
}

const exclude = (process.env.EXCLUDED_LANGUAGES ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

const manual = process.env.MANUAL_LANGUAGES?.trim();
let lines;
let note = null;

if (manual) {
  lines = parseManual(manual);
  console.log(`Languages: declared by hand, ${lines.size} entries, no requests made`);
} else {
  const raw = process.env.PRS_NUMBER_TO_CALCULATE_LANGUAGES?.trim() || "all";
  const limit = raw.toLowerCase() === "all" ? "all" : Number(raw);
  if (limit !== "all" && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error(`PRS_NUMBER_TO_CALCULATE_LANGUAGES: expected "all" or a whole number, got "${raw}"`);
  }
  const result = await measureLanguages(graphql, USERNAME, limit);
  lines = result.lines;
  // Say what the figures rest on, on the card itself: a share out of a hundred recent
  // pull requests is not the same claim as a share out of every one.
  note =
    result.read >= result.total
      ? `calculated analyzing all ${result.total} pull requests`
      : `calculated analyzing the latest ${result.read} pull requests`;
  console.log(`Languages: read ${result.read} of ${result.total} PRs`);
  if (result.truncated) {
    console.log(`  ${result.truncated} pull requests had over 100 files and were read in part`);
  }
  if (result.unmapped) {
    console.log(`  ${result.unmapped} changed lines had no recognised language and count as Other`);
  }
}

const segments = shareOut(lines, { exclude });
if (segments.length === 0) {
  throw new Error("No languages left to draw. Check EXCLUDED_LANGUAGES.");
}

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, render(segments, note), "utf8");

console.log(`Wrote ${OUTPUT}`);
console.log(`Requests (${httpLog.length}):`);
for (const url of httpLog) {
  console.log(`  ${decodeURIComponent(url)}`);
}
console.log(JSON.stringify(Object.fromEntries(segments.map((s) => [s.name, pct(s.share)]))));
