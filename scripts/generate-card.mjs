// Renders the GitHub stats card as an SVG. No dependencies: Node's global fetch
// and template strings only, so the token is never handed to third-party code.
//
// Which rows, which layout, which theme: all of it comes from card.config.json, by way
// of scripts/config.mjs. Only what a configuration file cannot hold is read from the
// environment.
//
// Env:
//   STATS_TOKEN     token used to read the stats (private repo read to count private work)
//   STATS_USERNAME  GitHub login to render
//   CARD_SUMMARY    optional path to also write the rendered values as JSON

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  ICONS,
  METRICS,
  SOURCE_REQUIREMENTS,
  effectiveRequirements,
} from "./metrics.mjs";
import {
  callGitHub,
  configure,
  graphql,
  httpLog,
  readTokenScopes,
} from "./github.mjs";
import { LAYOUTS } from "./layouts.mjs";
import { buildTheme } from "./theme.mjs";
import { loadConfig } from "./config.mjs";

const CONFIG = await loadConfig();

const TOKEN = requireEnv("STATS_TOKEN");
const USERNAME = requireEnv("STATS_USERNAME");
const OUTPUT = CONFIG.stats.output;

configure({ token: TOKEN, username: USERNAME });

// Where this card's requests start in the shared log. Both cards run in one process, so
// printing the whole log under each would credit one with the other's requests.
const REQUESTS_BEFORE = httpLog.length;

const YEAR = new Date().getUTCFullYear();

const THEME = buildTheme(CONFIG.theme, CONFIG.accent);

const LAYOUT = {
  minWidth: 467,
  padding: 25,
  bottomPad: 18,
  rowHeight: 25,
  iconGap: 25,
  valueGap: 20,
  columnGap: 30,
  // 14px Segoe UI averages a bit over half the font size per glyph. No font metrics
  // are available without a dependency, so column widths are estimated from this.
  charWidth: 7.6,
  spark: { plot: 40, caption: 22, axis: 16, gap: 16 },
};

// Rows read down a column and then across, so a column is a contiguous block.
const columnCount = (count) => (count <= 6 ? 1 : count <= 14 ? 2 : 3);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

// A row the token cannot support is dropped, not rendered. These fields do not
// error when under-privileged -- they return a smaller number, or the same number
// meaning something else, which is worse than a missing row.
function partition(rows, token) {
  const supported = [];
  const dropped = [];
  for (const metric of rows) {
    const required = effectiveRequirements(metric);
    // A token that exposes no scopes cannot be checked, so a row that needs one is
    // dropped rather than drawn with a caveat nobody reads. Rendering it would print
    // a public-only figure as though it were the answer, which is the failure this
    // whole mechanism exists to prevent -- and a token without scopes to read was
    // measured returning 105 commits where a sufficient one returned 933.
    const missing =
      token.scopes === null
        ? required.map((scope) => `${scope} (unverifiable token)`)
        : required.filter((scope) => !token.scopes.has(scope));
    (missing.length ? dropped : supported).push({ metric, missing });
  }
  return { supported: supported.map((e) => e.metric), dropped };
}

const PROFILE_QUERY = `
  query ($login: String!, $after: String, $yearStart: DateTime!, $now: DateTime!) {
    user(login: $login) {
      name
      login
      createdAt
      followers { totalCount }
      following { totalCount }
      gists { totalCount }
      starredRepositories { totalCount }
      organizations { totalCount }
      repositoryDiscussions { totalCount }
      discussionAnswers: repositoryDiscussionComments(onlyAnswers: true) { totalCount }
      pullRequests { totalCount }
      issues { totalCount }
      repositoriesContributedTo(
        first: 1
        contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]
      ) { totalCount }
      contributionsCollection(from: $yearStart, to: $now) {
        contributionCalendar { totalContributions }
      }
      repositories(first: 100, after: $after, ownerAffiliations: OWNER, isFork: false) {
        totalCount
        totalDiskUsage
        pageInfo { hasNextPage endCursor }
        nodes { stargazerCount forkCount watchers { totalCount } }
      }
    }
  }
`;

// Stars, forks and watchers need every owned repo, so the repository connection is
// paginated. Every other field is an aggregate and repeats identically per page.
async function fetchProfile() {
  let after = null;
  let user = null;
  let stars = 0;
  let forks = 0;
  let watchers = 0;

  do {
    const data = await graphql(PROFILE_QUERY, {
      login: USERNAME,
      after,
      yearStart: `${YEAR}-01-01T00:00:00Z`,
      now: new Date().toISOString(),
    });
    user = data.user;
    if (!user) {
      throw new Error(`No such user: ${USERNAME}`);
    }
    for (const repo of user.repositories.nodes) {
      stars += repo.stargazerCount;
      forks += repo.forkCount;
      watchers += repo.watchers.totalCount;
    }
    after = user.repositories.pageInfo.hasNextPage
      ? user.repositories.pageInfo.endCursor
      : null;
  } while (after);

  const contributions = user.contributionsCollection;
  const ageMs = Date.now() - new Date(user.createdAt).getTime();

  return {
    name: user.name || user.login,
    createdAt: user.createdAt,
    accountAgeYears: ageMs / (365.25 * 24 * 60 * 60 * 1000),
    stars,
    forks,
    watchers,
    followers: user.followers.totalCount,
    following: user.following.totalCount,
    starsGiven: user.starredRepositories.totalCount,
    repos: user.repositories.totalCount,
    gists: user.gists.totalCount,
    organizations: user.organizations.totalCount,
    diskUsageKb: user.repositories.totalDiskUsage,
    discussionsStarted: user.repositoryDiscussions.totalCount,
    discussionsAnswered: user.discussionAnswers.totalCount,
    prs: user.pullRequests.totalCount,
    issues: user.issues.totalCount,
    contributedTo: user.repositoriesContributedTo.totalCount,
    contributionsThisYear: contributions.contributionCalendar.totalContributions,
  };
}

// contributionsCollection accepts a window of at most one year, so all-time totals
// are the sum of one window per year since the account was created.
const contributionYears = (createdAt) => {
  const first = new Date(createdAt).getUTCFullYear();
  const last = new Date().getUTCFullYear();
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
};

const yearWindows = (years, selection) =>
  `query ($login: String!) { user(login: $login) {${years
    .map(
      (year) =>
        ` y${year}: contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${year}-12-31T23:59:59Z") { ${selection} }`,
    )
    .join("")} } }`;

async function fetchCalendar(createdAt) {
  const years = contributionYears(createdAt);
  const data = await graphql(
    yearWindows(years, "contributionCalendar { weeks { contributionDays { date contributionCount } } }"),
    { login: USERNAME },
  );

  // Yearly windows overlap at the edges, so merge by date before walking.
  const byDate = new Map();
  for (const year of Object.values(data.user)) {
    for (const week of year.contributionCalendar.weeks) {
      for (const day of week.contributionDays) {
        byDate.set(day.date, Math.max(byDate.get(day.date) ?? 0, day.contributionCount));
      }
    }
  }

  const dates = [...byDate.keys()].sort();
  const dayMs = 24 * 60 * 60 * 1000;
  let longest = 0;
  let run = 0;
  let previous = null;

  for (const date of dates) {
    if (byDate.get(date) === 0) {
      run = 0;
      previous = null;
      continue;
    }
    const consecutive =
      previous && Date.parse(date) - Date.parse(previous) === dayMs;
    run = consecutive ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }

  // The calendar runs to the end of the current year, so trail back from the last
  // day that actually has contributions. An empty today does not break a streak.
  const today = new Date().toISOString().slice(0, 10);
  let index = dates.findIndex((date) => date > today);
  index = (index === -1 ? dates.length : index) - 1;
  if (index >= 0 && byDate.get(dates[index]) === 0) {
    index -= 1;
  }
  let current = 0;
  while (index >= 0 && byDate.get(dates[index]) > 0) {
    current += 1;
    index -= 1;
  }

  // Monthly buckets for the sparkline. The yearly windows start in January, so
  // months before the account existed are dropped rather than drawn as a flat run.
  const firstMonth = createdAt.slice(0, 7);
  const monthly = new Map();
  for (const [date, count] of byDate) {
    const month = date.slice(0, 7);
    if (month < firstMonth || date > today) {
      continue;
    }
    monthly.set(month, (monthly.get(month) ?? 0) + count);
  }
  const series = [...monthly.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, count]) => ({ month, count }));

  return {
    current,
    longest,
    activeDays: [...byDate.values()].filter((count) => count > 0).length,
    series,
    total: series.reduce((sum, point) => sum + point.count, 0),
  };
}

// One request per distinct query: prsMerged and prsMergeRate share theirs.
async function fetchSearch(metrics) {
  const counts = {};
  const cache = new Map();

  for (const metric of metrics) {
    const query = metric.query
      .replace("{user}", USERNAME)
      .replace("{yearStart}", `${YEAR}-01-01`);
    if (!cache.has(query)) {
      const path =
        metric.endpoint === "commits"
          ? `search/commits?q=${encodeURIComponent(query)}&per_page=1`
          : `search/issues?q=${encodeURIComponent(query)}&per_page=1&advanced_search=true`;
      const result = await callGitHub(`https://api.github.com/${path}`);
      cache.set(query, result.total_count);
    }
    counts[metric.key] = cache.get(query);
  }

  return counts;
}

async function collect(rows, withSparkline) {
  const needed = new Set();
  if (withSparkline) {
    needed.add("calendar");
  }
  for (const metric of rows) {
    needed.add(metric.source);
    if (metric.alsoNeeds) {
      needed.add(metric.alsoNeeds);
    }
  }
  // The calendar windows are derived from the account creation date.
  if (needed.has("calendar")) {
    needed.add("profile");
  }

  const data = {};
  if (needed.has("profile")) {
    data.profile = await fetchProfile();
  }
  if (needed.has("calendar")) {
    data.calendar = await fetchCalendar(data.profile.createdAt);
  }
  if (needed.has("search")) {
    data.search = await fetchSearch(rows.filter((m) => m.source === "search"));
  }
  return { data, sources: [...needed] };
}

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const formatNumber = (value) =>
  value >= 100000
    ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)
    : String(Math.round(value));

// A metric whose inputs were not fetched yields NaN, which formats into a
// plausible-looking "NaN%" rather than failing. Nothing unfinished reaches a card.
function valueOf(metric, data) {
  const value = metric.value(data, metric);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${metric.key} computed ${value}, which is not a finite number`);
  }
  return value;
}

const render = (metric, value) => (metric.format ? metric.format(value) : formatNumber(value));

function renderCard(rows, data, spark) {
  // The layout name was checked when the configuration was read, so it exists.
  const layout = LAYOUTS[CONFIG.stats.layout];
  const cells = rows.map((metric) => ({
    label: metric.label.replace("{year}", String(YEAR)),
    value: render(metric, valueOf(metric, data)),
    icon: metric.icon,
  }));

  return layout(cells, spark, THEME, {
    name: data.profile.name,
    icons: CONFIG.stats.icons ? ICONS : null,
    formatNumber,
  });
}

// The configured list is already ordered and already known to name real metrics, so the
// rows are that list in that order.
const catalogue = new Map(METRICS.map((metric) => [metric.key, metric]));
const requested = CONFIG.stats.metrics.map((key) => catalogue.get(key));
if (requested.length === 0) {
  throw new Error(`No rows to draw: stats.metrics is empty in ${CONFIG.file}.`);
}

const token = await readTokenScopes();
const { supported, dropped = [] } = partition(requested, token);

console.log(
  `Token: ${token.kind}${token.scopes ? `, scopes: ${[...token.scopes].join(", ") || "(none)"}` : ""}`,
);
for (const { metric, missing } of dropped) {
  console.log(`Dropped ${metric.key}: token is missing ${missing.join(", ")}`);
}
if (supported.length === 0) {
  throw new Error("The token supports none of the enabled metrics.");
}

// The chart reads the same calendar the streak rows do, so it carries the same
// requirement and is dropped on the same terms rather than drawn from thin data.
const sparklineWanted = CONFIG.stats.sparkline;
const sparklineMissing =
  token.scopes === null
    ? (SOURCE_REQUIREMENTS.calendar ?? []).map((scope) => `${scope} (unverifiable token)`)
    : (SOURCE_REQUIREMENTS.calendar ?? []).filter((scope) => !token.scopes.has(scope));
const withSparkline = sparklineWanted && sparklineMissing.length === 0;
if (sparklineWanted && !withSparkline) {
  console.log(`Dropped sparkline: token is missing ${sparklineMissing.join(", ")}`);
}

const rows = supported;
const { data, sources } = await collect(rows, withSparkline);
const svg = renderCard(rows, data, withSparkline ? data.calendar : null);
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, svg, "utf8");

const values = Object.fromEntries(rows.map((m) => [m.key, render(m, valueOf(m, data))]));
if (process.env.CARD_SUMMARY) {
  await writeFile(process.env.CARD_SUMMARY, JSON.stringify(values, null, 2), "utf8");
}

const report = THEME.accentReport;
const describeAccent = (r) =>
  `${r.hex}${r.adjusted ? ` (raised from ${r.from} for contrast)` : ""}`;
console.log(
  `Config: ${CONFIG.present ? CONFIG.file : `${CONFIG.file} (absent, defaults used)`} | layout: ${CONFIG.stats.layout}${CONFIG.stats.icons ? " + icons" : ""}`,
);
console.log(
  `Theme: ${CONFIG.theme} | accent: ${
    report.hex ? describeAccent(report) : `light ${describeAccent(report.light)}, dark ${describeAccent(report.dark)}`
  }`,
);
console.log(`Wrote ${OUTPUT}`);
console.log(
  `Rows: ${rows.length}${withSparkline ? " + sparkline" : ""} | sources fetched: ${sources.sort().join(", ")}`,
);
const requests = httpLog.slice(REQUESTS_BEFORE);
console.log(`Requests (${requests.length}):`);
for (const url of requests) {
  console.log(`  ${decodeURIComponent(url)}`);
}
console.log(JSON.stringify(values));
