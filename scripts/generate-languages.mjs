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

import { configure, graphql, httpLog, readTokenScopes } from "./github.mjs";
import { measureLanguages, parseManual, shareOut } from "./languages.mjs";
import { renderLanguagesCard } from "./language-card.mjs";
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

const THEME_NAME = process.env.CARD_THEME || "dark";
const THEME = buildTheme(THEME_NAME, process.env.CARD_ACCENT);

const pct = (share) => `${share.toFixed(1)}%`;

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
  // Whether private pull requests are in reach changes what the figures describe, so
  // the note says which it counted rather than leaving the reader to assume.
  const token = await readTokenScopes();
  const canSeePrivate = token.scopes?.has("repo") ?? false;
  const kind = canSeePrivate ? "pull requests" : "public pull requests";

  const result = await measureLanguages(graphql, USERNAME, limit);
  lines = result.lines;
  // Say what the figures rest on, on the card itself: a share out of a hundred recent
  // pull requests is not the same claim as a share out of every one.
  note =
    result.read >= result.total
      ? `calculated analyzing all ${result.total} ${kind}`
      : `calculated analyzing the latest ${result.read} ${kind}`;
  console.log(`Languages: read ${result.read} of ${result.total} PRs`);
  if (result.truncated) {
    console.log(`  ${result.truncated} pull requests had over 100 files and were read in part`);
  }
  if (result.unmapped) {
    console.log(`  ${result.unmapped} changed lines had no recognized language and count as Other`);
  }
}

const segments = shareOut(lines, { exclude });
if (segments.length === 0) {
  throw new Error("No languages left to draw. Check EXCLUDED_LANGUAGES.");
}

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(
  OUTPUT,
  renderLanguagesCard(segments, note, THEME, THEME_NAME, `${USERNAME}'s languages`),
  "utf8",
);

console.log(`Wrote ${OUTPUT}`);
console.log(`Requests (${httpLog.length}):`);
for (const url of httpLog) {
  console.log(`  ${decodeURIComponent(url)}`);
}
console.log(JSON.stringify(Object.fromEntries(segments.map((s) => [s.name, pct(s.share)]))));
