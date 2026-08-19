// Counts the profiles publishing a card, by searching for the signature the cards carry.
// There is no telemetry to read: the count comes from GitHub's code search over public
// repositories, which is where the cards end up. A profile repository has to be public
// for its README to render, so a card that exists is a card that can be found.
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

const response = await fetch(
  `https://api.github.com/search/code?q=${encodeURIComponent(QUERY)}&per_page=100`,
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
const result = await response.json();

// One profile can publish both cards, so repositories are what to count, not files.
const repos = new Set(result.items.map((item) => item.repository.full_name));

const phrase = `used by ${repos.size} public ${repos.size === 1 ? "repository" : "repositories"}`;

if (process.argv.includes("--write")) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { renderAdoptersBadge } = await import("./adopters-badge.mjs");
  await mkdir("assets", { recursive: true });
  await writeFile("assets/adopters.svg", renderAdoptersBadge(repos.size), "utf8");
  console.log(`Badge redrawn: ${phrase}`);
}

console.log(`Query: ${QUERY}`);
console.log(`Files matched: ${result.total_count}${result.incomplete_results ? " (incomplete)" : ""}`);
console.log(`Repositories: ${repos.size}${result.total_count > 100 ? "+ (first 100 files only)" : ""}`);
for (const name of [...repos].sort()) {
  console.log(`  ${name}`);
}
