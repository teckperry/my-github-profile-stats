// Renders the languages card. Separate from the stats card because it answers a
// different question from a different source, and because a reader should be able to
// take one without the other.
//
// The measurement and how it is drawn come from card.config.json, by way of
// scripts/config.mjs. Only what a configuration file cannot hold is read from the
// environment.
//
// Env:
//   STATS_TOKEN     token used to read the pull requests
//   STATS_USERNAME  GitHub login to render

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { configure, graphql, httpLog, readTokenScopes } from "./github.mjs";
import { measureLanguages, shareOut } from "./languages.mjs";
import { renderLanguagesCard } from "./language-card.mjs";
import { buildTheme } from "./theme.mjs";
import { loadConfig } from "./config.mjs";

const CONFIG = await loadConfig();

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
};

const TOKEN = requireEnv("STATS_TOKEN");
const USERNAME = requireEnv("STATS_USERNAME");
const OUTPUT = CONFIG.languages.output;

configure({ token: TOKEN, username: USERNAME });

// Where this card's requests start in the shared log -- see the note in generate-card.mjs.
const REQUESTS_BEFORE = httpLog.length;

const THEME_NAME = CONFIG.theme;
const THEME = buildTheme(THEME_NAME, CONFIG.accent);

const pct = (share) => `${share.toFixed(1)}%`;

const { exclude, manual, pullRequestsToRead: limit, top } = CONFIG.languages;
let lines;
let note = null;

if (manual) {
  lines = manual;
  console.log(`Languages: declared by hand, ${lines.size} entries, no requests made`);
} else {
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

const segments = shareOut(lines, { exclude, top });
if (segments.length === 0) {
  throw new Error(`No languages left to draw. Check languages.exclude in ${CONFIG.file}.`);
}

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(
  OUTPUT,
  renderLanguagesCard(segments, note, THEME, THEME_NAME, `${USERNAME}'s languages`),
  "utf8",
);

console.log(
  `Config: ${CONFIG.present ? CONFIG.file : `${CONFIG.file} (absent, defaults used)`} | theme: ${THEME_NAME}`,
);
console.log(`Wrote ${OUTPUT}`);
const requests = httpLog.slice(REQUESTS_BEFORE);
console.log(`Requests (${requests.length}):`);
for (const url of requests) {
  console.log(`  ${decodeURIComponent(url)}`);
}
console.log(JSON.stringify(Object.fromEntries(segments.map((s) => [s.name, pct(s.share)]))));
