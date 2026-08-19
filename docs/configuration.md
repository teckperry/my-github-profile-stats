# Configuration

Everything lives in the `env:` blocks of `.github/workflows/update-profile-cards.yml`,
each with a comment beside it.

**built-in** means the option works on the token Actions provides by itself, with nothing
for you to create. **read token** means it needs the classic token, because the figure
includes private work. A *read token* row is dropped, not guessed, when the token is
missing — see [security.md](security.md).

## Look

| Variable | Values | Works with |
| --- | --- | --- |
| `CARD_LAYOUT` | `tiles`, `mono` | built-in |
| `CARD_THEME` | `dark`, `light`, `auto` | built-in |
| `CARD_ACCENT` | any hex; empty uses the theme's own | built-in |
| `CARD_ICONS` | `true`, `false` | built-in |
| `SHOW_SPARKLINE` | `true`, `false` | read token |
| `METRIC_ORDER` | comma-separated metric keys, in order | built-in |

`SHOW_SPARKLINE` reads the contribution calendar, so without the read token the chart is
left out rather than drawn from public days alone. Why colors behave the way they do is
in [design.md](design.md).

## Rows — on by default

| Variable | Row | Works with |
| --- | --- | --- |
| `SHOW_STARS` | Total Stars Earned | built-in |
| `SHOW_COMMITS` | Total Commits | read token |
| `SHOW_PRS` | Total PRs | read token |
| `SHOW_ISSUES` | Total Issues | read token |
| `SHOW_CONTRIBUTED_TO` | Contributed to | read token |

## Rows — off by default

| Variable | Row | Works with |
| --- | --- | --- |
| `SHOW_FORKS` | Total Forks Earned | built-in |
| `SHOW_WATCHERS` | Total Watchers | built-in |
| `SHOW_FOLLOWERS` | Followers | built-in |
| `SHOW_FOLLOWING` | Following | built-in |
| `SHOW_STARS_GIVEN` | Stars Given | built-in |
| `SHOW_REPOS` | Repositories | built-in |
| `SHOW_GISTS` | Public Gists | built-in |
| `SHOW_ORGANIZATIONS` | Organizations | built-in |
| `SHOW_DISK_USAGE` | Repository Size | built-in |
| `SHOW_ACCOUNT_AGE` | Account Age | built-in |
| `SHOW_PRS_MERGED` | PRs Merged | read token |
| `SHOW_PRS_MERGE_RATE` | PR Merge Rate | read token |
| `SHOW_PRS_REVIEWED` | PRs Reviewed | read token |
| `SHOW_PRS_COMMENTED` | PRs Commented | read token |
| `SHOW_ISSUES_COMMENTED` | Issues Commented | read token |
| `SHOW_DISCUSSIONS_STARTED` | Discussions Started | built-in |
| `SHOW_DISCUSSIONS_ANSWERED` | Discussions Answered | built-in |
| `SHOW_COMMITS_THIS_YEAR` | Commits (YYYY) | read token |
| `SHOW_CONTRIBUTIONS_THIS_YEAR` | Contributions (YYYY) | read token |
| `SHOW_STREAK_CURRENT` | Current Streak | read token |
| `SHOW_STREAK_LONGEST` | Longest Streak | read token |
| `SHOW_ACTIVE_DAYS` | Active Days | read token |

Only the APIs the enabled rows need are called: the default set costs two requests.
`YYYY` is the current year, computed per run. What each row actually measures is in
[metrics.md](metrics.md).

## Languages

| Variable | Values | Works with |
| --- | --- | --- |
| `PRS_NUMBER_TO_CALCULATE_LANGUAGES` | `all` (default), or how many recent pull requests to read | built-in, public only |
| `EXCLUDED_LANGUAGES` | comma-separated names to leave out | either |
| `MANUAL_LANGUAGES` | `Terraform 54, TypeScript 21` | **no token used** |

The method, and why `all` is the default, is in [languages.md](languages.md).

## Picking rows by looking at them

```bash
STATS_TOKEN=$(gh auth token) STATS_USERNAME=<your-login> node scripts/preview.mjs
open preview/index.html
```

Renders the card with every metric enabled and lists each row's flag beside its value.
