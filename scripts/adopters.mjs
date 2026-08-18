// Counts the profiles publishing a card, by searching for the signature the cards carry.
// There is no telemetry to read: the count comes from GitHub's code search over public
// repositories, which is where the cards end up. A profile repository has to be public
// for its README to render, so a card that exists is a card that can be found.
//
//   GITHUB_TOKEN=$(gh auth token) node scripts/adopters.mjs

const TOKEN = process.env.GITHUB_TOKEN ?? process.env.STATS_TOKEN;
if (!TOKEN) {
  throw new Error("GITHUB_TOKEN is required: code search will not answer unauthenticated.");
}

const SELF = "teckperry/my-github-profile-stats";
const QUERY = `"my-github-profile-stats" in:file extension:svg -repo:${SELF}`;

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

console.log(`Query: ${QUERY}`);
console.log(`Files matched: ${result.total_count}${result.incomplete_results ? " (incomplete)" : ""}`);
console.log(`Profiles: ${repos.size}${result.total_count > 100 ? "+ (first 100 files only)" : ""}`);
for (const name of [...repos].sort()) {
  console.log(`  ${name}`);
}
