// The metric catalogue. Each entry declares which data source it needs, so a run
// only issues the API calls its enabled metrics actually require.
//
// Sources:
//   profile   one GraphQL query: user scalars, owned repos, last-year contributions
//   calendar  one GraphQL query: per-year contribution days, for streaks
//   search    one REST search call per metric

// Octicons by GitHub, MIT licensed. Keys are the upstream icon names, verified
// against primer/octicons by comparing path data: star-16, history-16,
// git-pull-request-16 and repo-16 match v17, issueOpened matches v11 and v12 and was
// redrawn upstream afterwards. See the license note in the README.
export const ICONS = {
  star: "M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694v.001z",
  history:
    "M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684zM7.75 4a.75.75 0 01.75.75v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.75.75 0 017 8.25v-3.5A.75.75 0 017.75 4z",
  gitPullRequest: "M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z",
  issueOpened:
    "M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z",
  repo: "M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z",
};

const percent = (value) => `${value.toFixed(1)}%`;
const days = (value) => `${value} ${value === 1 ? "day" : "days"}`;

// `enabled` is the default when the environment says nothing. The five that are
// on by default are the ones the card already showed.
export const METRICS = [
  // --- Reach -------------------------------------------------------------
  { key: "stars", label: "Total Stars Earned", icon: "star", source: "profile", enabled: true, value: (d) => d.profile.stars },
  { key: "forks", label: "Total Forks Earned", icon: "star", source: "profile", value: (d) => d.profile.forks },
  { key: "watchers", label: "Total Watchers", icon: "star", source: "profile", value: (d) => d.profile.watchers },
  { key: "followers", label: "Followers", icon: "repo", source: "profile", value: (d) => d.profile.followers },
  { key: "following", label: "Following", icon: "repo", source: "profile", value: (d) => d.profile.following },
  { key: "starsGiven", label: "Stars Given", icon: "star", source: "profile", value: (d) => d.profile.starsGiven },

  // --- Footprint ---------------------------------------------------------
  { key: "repos", label: "Repositories", icon: "repo", source: "profile", value: (d) => d.profile.repos },
  { key: "gists", label: "Public Gists", icon: "repo", source: "profile", value: (d) => d.profile.gists },
  { key: "organizations", label: "Organizations", icon: "repo", source: "profile", value: (d) => d.profile.organizations },
  { key: "diskUsage", label: "Repository Size", icon: "repo", source: "profile", value: (d) => d.profile.diskUsageKb, format: (v) => `${(v / 1024).toFixed(1)} MB` },
  { key: "accountAge", label: "Account Age", icon: "history", source: "profile", value: (d) => d.profile.accountAgeYears, format: (v) => `${v.toFixed(1)} yrs` },

  // --- Volume, all time --------------------------------------------------
  { key: "commits", label: "Total Commits", icon: "history", source: "search", enabled: true, endpoint: "commits", query: "author:{user}", value: (d) => d.search.commits },
  // Contribution-collection metrics are viewer-dependent: the same field returns a
  // different number depending on what the reading token can see, and it does so
  // silently. Measured 2026-08-18 on this account: totalCommitContributions summed
  // to 993 under `read:org,read:user`, to 993 under `repo,read:user`, and to 113
  // under `repo,read:org` -- because with both scopes the private commits are
  // reclassified as restricted instead of counted as public. A publicCommits /
  // privateActivity pair was dropped for that reason: with a partial token it does
  // not under-report, it misattributes.
  { key: "prs", label: "Total PRs", icon: "gitPullRequest", source: "profile", requires: ["repo"], enabled: true, value: (d) => d.profile.prs },
  { key: "issues", label: "Total Issues", icon: "issueOpened", source: "profile", requires: ["repo"], enabled: true, value: (d) => d.profile.issues },
  { key: "contributedTo", label: "Contributed to", icon: "repo", source: "profile", requires: ["repo"], enabled: true, value: (d) => d.profile.contributedTo },

  // --- Review and collaboration -----------------------------------------
  { key: "prsMerged", label: "PRs Merged", icon: "gitPullRequest", source: "search", endpoint: "issues", query: "author:{user} type:pr is:merged", value: (d) => d.search.prsMerged },
  { key: "prsMergeRate", label: "PR Merge Rate", icon: "gitPullRequest", source: "search", endpoint: "issues", query: "author:{user} type:pr is:merged", alsoNeeds: "profile", value: (d, self) => (d.profile.prs ? (d.search[self.key] / d.profile.prs) * 100 : 0), format: percent },
  { key: "prsReviewed", label: "PRs Reviewed", icon: "gitPullRequest", source: "search", endpoint: "issues", query: "reviewed-by:{user} type:pr", value: (d) => d.search.prsReviewed },
  { key: "prsCommented", label: "PRs Commented", icon: "gitPullRequest", source: "search", endpoint: "issues", query: "commenter:{user} type:pr", value: (d) => d.search.prsCommented },
  { key: "issuesCommented", label: "Issues Commented", icon: "issueOpened", source: "search", endpoint: "issues", query: "commenter:{user} type:issue", value: (d) => d.search.issuesCommented },
  { key: "discussionsStarted", label: "Discussions Started", icon: "issueOpened", source: "profile", value: (d) => d.profile.discussionsStarted },
  { key: "discussionsAnswered", label: "Discussions Answered", icon: "issueOpened", source: "profile", value: (d) => d.profile.discussionsAnswered },

  // --- Last twelve months ------------------------------------------------
  { key: "commitsThisYear", label: "Commits ({year})", icon: "history", source: "search", endpoint: "commits", query: "author:{user} author-date:>={yearStart}", value: (d, self) => d.search[self.key] },
  { key: "contributionsThisYear", label: "Contributions ({year})", icon: "history", source: "profile", requires: ["repo"], value: (d) => d.profile.contributionsThisYear },

  // --- Rhythm ------------------------------------------------------------
  { key: "streakCurrent", label: "Current Streak", icon: "history", source: "calendar", value: (d) => d.calendar.current, format: days },
  { key: "streakLongest", label: "Longest Streak", icon: "history", source: "calendar", value: (d) => d.calendar.longest, format: days },
  { key: "activeDays", label: "Active Days", icon: "history", source: "calendar", value: (d) => d.calendar.activeDays, format: days },
];

// Scopes a source needs to return truthful numbers, measured rather than assumed.
// Everything that reads across repositories needs `repo`. `read:org` was expected
// to matter and does not: the contribution calendar returns identical figures with
// and without it, and the fields that did depend on it were the misattributing ones
// that have since been removed.
export const SOURCE_REQUIREMENTS = {
  // Reach and footprint figures read public data and were correct under a token
  // with no repo access, so requiring it here would discard a truthful row.
  profile: [],
  search: ["repo"],
  calendar: ["repo"],
};

// A metric may need more than its source. Effective requirement is
// `metric.requires ?? SOURCE_REQUIREMENTS[metric.source]`.
export const effectiveRequirements = (metric) =>
  metric.requires ?? SOURCE_REQUIREMENTS[metric.source] ?? [];

export const envFlag = (key) => `SHOW_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`;
