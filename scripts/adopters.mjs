// Counts the profiles publishing a card, by searching for the signature the cards carry.
// There is no telemetry to read: the count comes from GitHub's code search over public
// repositories, which is where the cards end up. A profile repository has to be public
// for its README to render, so a card that exists is a card that can be found.
//
// A floor, not a census, and the badge now says so. Only what GitHub has indexed can be
// found, and indexing is neither immediate nor guaranteed: measured on 2026-08-20, a card
// published 22 hours earlier in a public, non-forked repository returned nothing for any
// query at all -- not for the signature, not for `svg`, not for its own readme, which had
// been sitting there since 2021. Two adopters, one counted.
//
//   GITHUB_TOKEN=$(gh auth token) node scripts/adopters.mjs
//   ... --write   also redraws assets/adopters.svg

const TOKEN = process.env.GITHUB_TOKEN ?? process.env.STATS_TOKEN;
if (!TOKEN) {
  throw new Error("GITHUB_TOKEN is required: code search will not answer unauthenticated.");
}

const SELF = "teckperry/my-github-profile-stats";
// Excluding examples/ as well as this repository: a copy made before the examples stopped
// being signed still carries ten signed files that are demonstrations, not cards in use.
const QUERY = `"my-github-profile-stats" in:file extension:svg -repo:${SELF} -path:examples`;

const PER_PAGE = 100;
// Pages are of files, not of profiles, and a profile publishing both cards is two files.
// One page held the count only up to about fifty adopters, and printed a "+" in the log
// while the badge drew the truncated number as though it were the total.
//
// Ten pages is the ceiling rather than a choice: search returns at most a thousand results
// however many are asked for. That is around five hundred adopters -- distant, but a run
// that reaches it says so instead of quietly reporting a floor of a floor.
const MAX_PAGES = 10;

async function fetchPage(number) {
  const response = await fetch(
    `https://api.github.com/search/code?q=${encodeURIComponent(QUERY)}&per_page=${PER_PAGE}&page=${number}`,
    {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${TOKEN}`,
        "user-agent": "adopters/my-github-profile-stats",
      },
    },
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${await response.text()}`);
  }
  return response.json();
}

// Repositories, not files: one profile publishing both cards matches twice and is one
// adopter. Visibility arrives with each match, which is the only way to hold the count to
// public repositories -- `is:public` is not a code-search qualifier, and a query carrying
// it returns zero results rather than an error, which would have emptied the badge in
// silence. Measured: it returns nothing even for this project's own cards.
const visibility = new Map();
let files = 0;
let reported = 0;
let truncated = false;

for (let number = 1; number <= MAX_PAGES; number += 1) {
  const result = await fetchPage(number);
  reported = result.total_count;
  files += result.items.length;
  for (const item of result.items) {
    visibility.set(item.repository.full_name, item.repository.private);
  }
  if (result.items.length < PER_PAGE) {
    break;
  }
  truncated = number === MAX_PAGES && result.total_count > MAX_PAGES * PER_PAGE;
}

const found = [...visibility]
  .filter(([, isPrivate]) => !isPrivate)
  .map(([name]) => name)
  .sort();
const withheld = visibility.size - found.length;
const count = found.length;

const phrase = count === 0
  ? "used by 0 public repositories"
  : `used by ${count}+ public repositories`;

if (process.argv.includes("--write")) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { renderAdoptersBadge } = await import("./adopters-badge.mjs");
  await mkdir("assets", { recursive: true });
  await writeFile("assets/adopters.svg", renderAdoptersBadge(count), "utf8");
  console.log(`Badge redrawn: ${phrase}`);
}

console.log(`Query: ${QUERY}`);
console.log(
  `Files matched: ${files}, of ${reported} reported${reported > 1000 ? " (approximate above a thousand)" : ""}`,
);
// Counted, never named. Run with a personal token, these are the runner's own private
// repositories, and this log is public.
if (withheld) {
  console.log(
    `Left out ${withheld} private ${withheld === 1 ? "repository" : "repositories"}: the count is of published cards`,
  );
}
if (truncated) {
  console.log("Search reached its thousand-result ceiling: the count is short by whatever lies past it");
}
console.log(`Repositories: ${count}`);
for (const name of found) {
  console.log(`  ${name}`);
}
