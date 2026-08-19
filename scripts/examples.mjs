// Writes the example cards in examples/ from placeholder data. No token, no requests:
// the figures are invented, so the examples never change when an account does and
// nobody's numbers end up in this repository.
//
//   node scripts/examples.mjs

import { mkdir, writeFile } from "node:fs/promises";

import { ICONS } from "./metrics.mjs";
import { renderLanguagesCard } from "./language-card.mjs";
import { LAYOUTS, SIGNATURE } from "./layouts.mjs";
import { shareOut } from "./languages.mjs";
import { buildTheme } from "./theme.mjs";

const OUT = "examples";

const formatNumber = (value) =>
  value >= 100000
    ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)
    : String(Math.round(value));

// Round, obviously-invented figures, so no reader mistakes an example for a claim.
const CELLS = [
  { label: "Total Commits", value: "1,200", icon: "history" },
  { label: "Commits (2026)", value: "400", icon: "history" },
  { label: "Total PRs", value: "800", icon: "gitPullRequest" },
  { label: "PR Merge Rate", value: "90.0%", icon: "gitPullRequest" },
  { label: "PRs Reviewed", value: "600", icon: "gitPullRequest" },
  { label: "Total Issues", value: "50", icon: "issueOpened" },
  { label: "Total Stars Earned", value: "120", icon: "star" },
];

const EXTRA = [
  { label: "Total Forks Earned", value: "30", icon: "star" },
  { label: "Total Watchers", value: "45", icon: "star" },
  { label: "Followers", value: "80", icon: "repo" },
  { label: "Following", value: "60", icon: "repo" },
  { label: "Stars Given", value: "150", icon: "star" },
  { label: "Repositories", value: "40", icon: "repo" },
  { label: "Public Gists", value: "10", icon: "repo" },
  { label: "Organizations", value: "3", icon: "repo" },
  { label: "Repository Size", value: "25.0 MB", icon: "repo" },
  { label: "Account Age", value: "8.0 yrs", icon: "history" },
  { label: "Contributed to", value: "35", icon: "repo" },
  { label: "PRs Merged", value: "720", icon: "gitPullRequest" },
  { label: "PRs Commented", value: "500", icon: "gitPullRequest" },
  { label: "Issues Commented", value: "90", icon: "issueOpened" },
  { label: "Discussions Started", value: "12", icon: "issueOpened" },
  { label: "Discussions Answered", value: "8", icon: "issueOpened" },
  { label: "Contributions (2026)", value: "1,500", icon: "history" },
  { label: "Current Streak", value: "5 days", icon: "history" },
  { label: "Longest Streak", value: "30 days", icon: "history" },
  { label: "Active Days", value: "600 days", icon: "history" },
];

// A fixed shape rather than a random one, so regenerating the examples produces the
// same bytes and the repository stays quiet.
const SPARK = (() => {
  const shape = [1, 1, 2, 2, 3, 5, 4, 6, 9, 7, 12, 10, 14, 18, 15, 22, 19, 26, 24, 30,
                 27, 34, 31, 38, 35, 42, 39, 46, 43, 50, 47, 55, 52, 60, 57, 64];
  const series = shape.map((count, i) => {
    const month = 3 + i;
    return { month: `${2023 + Math.floor(month / 12)}-${String((month % 12) + 1).padStart(2, "0")}`, count };
  });
  return { series, total: series.reduce((s, p) => s + p.count, 0) };
})();

const LANGUAGES = new Map([
  ["Terraform", 5400], ["TypeScript", 2100], ["Python", 1200],
  ["YAML", 700], ["Shell", 400], ["Markdown", 200],
]);

const files = [];

// Examples are demonstrations, not cards in use, so they carry no signature. Leaving it in
// made every copy of this repository count as an adopter: the ten files here matched the
// search, whether or not anybody had published anything.
const EXAMPLE_NOTE = "<!-- An example card, drawn from invented figures. Not a signed card. -->";

const write = async (name, svg) => {
  await writeFile(`${OUT}/${name}.svg`, svg.replace(SIGNATURE, EXAMPLE_NOTE), "utf8");
  files.push(name);
};

await mkdir(OUT, { recursive: true });

const statsCard = (layout, themeName, icons, cells = CELLS) => {
  const theme = buildTheme(themeName);
  return LAYOUTS[layout](cells, SPARK, theme, {
    name: "Example User",
    icons: icons ? ICONS : null,
    formatNumber,
  });
};

for (const layout of Object.keys(LAYOUTS)) {
  await write(`stats-${layout}`, statsCard(layout, "auto", false));
  await write(`stats-${layout}-icons`, statsCard(layout, "auto", true));
}
// Both fixed themes, so a reader can see what auto is choosing between.
await write("stats-tiles-light", statsCard("tiles", "light", true));
await write("stats-mono-dark", statsCard("mono", "dark", true));
// Every row on, which is what decides whether a layout survives density.
await write("stats-tiles-dense", statsCard("tiles", "auto", true, [...CELLS, ...EXTRA]));
await write("stats-mono-dense", statsCard("mono", "auto", true, [...CELLS, ...EXTRA]));

const segments = shareOut(LANGUAGES, { top: 6 });
await write(
  "languages",
  renderLanguagesCard(
    segments,
    "calculated analyzing all 800 pull requests",
    buildTheme("auto"),
    "auto",
    "Example User's languages",
  ),
);
await write(
  "languages-manual",
  renderLanguagesCard(segments, null, buildTheme("auto"), "auto", "Example User's languages"),
);

console.log(`Wrote ${files.length} examples to ${OUT}/`);
for (const name of files) {
  console.log(`  ${name}.svg`);
}
