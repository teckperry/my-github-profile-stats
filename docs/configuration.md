# Configuration

Everything the cards show lives in **`card.config.json`**, at the root of your copy. Edit
it, commit, and the next run draws it.

```json
{
  "$schema": "./docs/card.config.schema.json",

  "theme": "auto",
  "accent": null,

  "stats": {
    "enabled": true,
    "output": "profile/stats.svg",
    "layout": "tiles",
    "icons": false,
    "sparkline": true,
    "metrics": [
      "commits",
      "commitsThisYear",
      "prs",
      "prsMergeRate",
      "prsReviewed",
      "issues",
      "stars"
    ]
  },

  "languages": {
    "enabled": true,
    "output": "profile/languages.svg",
    "pullRequestsToRead": "all",
    "exclude": [],
    "manual": {},
    "top": 6
  }
}
```

That is the whole surface — there is nothing that is not in there. Every key is optional:
whatever you leave out keeps its default, so a file may name one option or none, and
deleting the file altogether gives you the defaults rather than a failed run.

The `$schema` line is what makes an editor complete the keys and explain them on hover,
including all twenty-seven metric names. Leave it where it is.

Below, **built-in** means the option works on the token Actions provides by itself, with
nothing for you to create. **read token** means it needs the classic token, because the
figure includes private work. A *read token* row is dropped, not guessed, when the token
is missing — see [security.md](security.md).

## Look

| Key | Values | Works with |
| --- | --- | --- |
| `theme` | `"dark"`, `"light"`, `"auto"` — which follows the reader | built-in |
| `accent` | any hex; `null` uses the theme's own | built-in |
| `stats.layout` | `"tiles"`, `"mono"` | built-in |
| `stats.icons` | `true`, `false`, `null` to leave it to the layout | built-in |
| `stats.sparkline` | `true`, `false` | read token |

`sparkline` reads the contribution calendar, so without the read token the chart is left
out rather than drawn from public days alone. An accent too close to the surface it lands
on is lightened until it is readable, and the run says so — [design.md](design.md).

## Rows

`stats.metrics` is the list of rows, in the order they appear. The list both picks them and
orders them: a row is on the card because it is named, where it is named. An empty list is
an error rather than an empty card.

### The seven in the file you were given

| Key | Row | Works with |
| --- | --- | --- |
| `commits` | Total Commits | read token |
| `commitsThisYear` | Commits (YYYY) | read token |
| `prs` | Total PRs | read token |
| `prsMergeRate` | PR Merge Rate | read token |
| `prsReviewed` | PRs Reviewed | read token |
| `issues` | Total Issues | read token |
| `stars` | Total Stars Earned | built-in |

### The other twenty

| Key | Row | Works with |
| --- | --- | --- |
| `forks` | Total Forks Earned | built-in |
| `watchers` | Total Watchers | built-in |
| `followers` | Followers | built-in |
| `following` | Following | built-in |
| `starsGiven` | Stars Given | built-in |
| `repos` | Repositories | built-in |
| `gists` | Public Gists | built-in |
| `organizations` | Organizations | built-in |
| `diskUsage` | Repository Size | built-in |
| `accountAge` | Account Age | built-in |
| `contributedTo` | Contributed to | read token |
| `prsMerged` | PRs Merged | read token |
| `prsCommented` | PRs Commented | read token |
| `issuesCommented` | Issues Commented | read token |
| `discussionsStarted` | Discussions Started | built-in |
| `discussionsAnswered` | Discussions Answered | built-in |
| `contributionsThisYear` | Contributions (YYYY) | read token |
| `streakCurrent` | Current Streak | read token |
| `streakLongest` | Longest Streak | read token |
| `activeDays` | Active Days | read token |

Only the APIs the listed rows need are called: the seven above cost two requests. `YYYY` is
the current year, computed per run. What each row actually measures is in
[metrics.md](metrics.md).

## Languages

| Key | Values | Works with |
| --- | --- | --- |
| `languages.pullRequestsToRead` | `"all"` (default), or how many recent pull requests to read | built-in, public only |
| `languages.exclude` | names to leave out: `["JSON", "YAML"]` | either |
| `languages.manual` | `{"Terraform": 54, "TypeScript": 21}` | **no token used** |
| `languages.top` | how many to name before the rest fold into Other; 1 to 12, default 6 | either |

`manual` weights are shared out, so percentages and raw line counts both work, and setting
it makes **no request at all**. An empty object measures instead. The method, and why `all`
is the default, is in [languages.md](languages.md).

## One card instead of two

`stats.enabled` and `languages.enabled`. A card turned off is not drawn and makes none of
its requests. Both off is an error, not a very fast run.

## Where the files go

`stats.output` and `languages.output` are paths **inside your profile repository** —
`profile/stats.svg` is what this readme's snippet embeds. They must stay inside it: an
absolute path, or one that climbs out with `..`, is refused rather than followed.

Move one and nothing else changes. That is the point of the paths being here: the commit
step adds whatever the run wrote, wherever it wrote it.

## Checking a file before a run uses it

```bash
node scripts/config.mjs
```

Prints exactly what your file resolves to, lists the metrics you have not turned on, and
exits `1` naming the key if something is wrong — an unknown option, a metric that does not
exist, a colour that is not a colour. A run does the same check before its first request.

## Picking rows by looking at them

```bash
STATS_TOKEN=$(gh auth token) STATS_USERNAME=<your-login> node scripts/preview.mjs
open preview/index.html
```

Renders the card with every metric enabled, lists each row's key beside its value, and
prints the whole set as a `"metrics"` array to trim and paste.

## Which version you have

`VERSION` names the release your copy came from, and every run prints it. Compare it with
the [latest release](https://github.com/teckperry/my-github-profile-stats/releases/latest)
to see whether you are behind.

## Why none of this is in the workflow

It used to be — forty-four `env:` keys in
`.github/workflows/update-profile-cards.yml`. It moved for one mechanical reason: **a token
without the `workflow` scope cannot write to `.github/workflows/**`**. GitHub answers 404,
and no entry in a `permissions:` block grants it — it is a deliberate
privilege-escalation guard. So anything left in the workflow could never be updated for
you, while everything in `card.config.json` can.

Which is also why this project will never edit your `card.config.json`. It is yours; new
options arrive with defaults in code, so your file keeps working and no update ever
arrives as a conflict in it.

One consequence, if you were here before this file existed: **an environment variable still
wins over the file**. A copy still carrying the old `env:` block renders exactly what it
always did, and stops only once you delete those keys.
