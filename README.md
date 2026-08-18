# my-github-profile-stats

Two SVG cards for a GitHub profile README, rendered by a workflow in your own
repository and committed as files. Nothing is requested from a third party when
somebody opens your profile, and nothing is installed when the cards are built.

<img src="https://raw.githubusercontent.com/teckperry/teckperry/main/profile/stats.svg" width="480" alt="">

<img src="https://raw.githubusercontent.com/teckperry/teckperry/main/profile/languages.svg" width="470" alt="">

## What it does differently

**It says what it measured.** The languages card carries its own basis —
`calculated analyzing all 716 pull requests` — because a share out of a hundred recent
pull requests is not the same claim as a share out of every one.

**It drops what it cannot stand behind.** Several GitHub fields do not fail when a
token is too narrow: they return a smaller number, or the same number meaning
something else. Every metric declares the scopes it needs, and a run reads the token's
actual scopes and omits the rows it cannot support, naming each omission. Measured on
one account, the same card reported 105 commits and 32 pull requests under a narrow
token against 933 and 716 under a sufficient one — with no error either time.

**It counts languages from what you changed.** Repository language statistics describe
what is inside a repository and carry no notion of authorship, so aggregating them
credits a whole repository's composition to anyone who touched it. On one account that
reported HTML 73%, from a static blog's generated output, and Jupyter Notebook 49%,
from a data repository committed to a handful of times. Counting the lines changed in
that account's own pull requests reported Terraform 54%, YAML 16%, TypeScript 12%.

**No dependencies.** Three imports, two of them Node built-ins. No `package.json`, no
lockfile, no install step, and `actions/checkout` pinned to a commit SHA is the only
action. The trust surface is small enough to read in an afternoon.

## Setting it up

**1. Fork this repository and make your fork private.** It will hold a broad read
credential, and a private repository keeps both the secret and the run logs out of
public view. Actions minutes for private repositories come out of your monthly
allowance — about 30 of the 2,000 the Free plan includes, since a run takes well
under a minute.

**2. Create the read token.** A **classic** personal access token at
<https://github.com/settings/tokens> with `repo` and `read:user`, and nothing else.
`repo` is required for any private work to be counted and has no read-only variant, so
it also grants write access to every repository you can reach — that is the
unavoidable part, and the reason the fork is private. Store it as the repository secret
`STATS_READ_PAT`.

`read:org` is *not* needed. The contribution calendar returns identical figures with
and without it, measured on two tokens differing only in that scope.

A **fine-grained** token cannot substitute. It is bound to a single resource owner, so
it cannot span both your own repositories and an organisation's, and it exposes no
scopes, so nothing can be checked against it.

**3. Create the write token.** A **fine-grained** token at
<https://github.com/settings/personal-access-tokens/new>, scoped to your profile
repository alone — the one named after you — with `Contents: Read and write`. Store it
as `PROFILE_WRITE_TOKEN`. This is the only credential that can change anything, and it
can only change that one repository.

**4. Run it.** Actions → *Update profile cards* → *Run workflow*. The `dry_run` input
renders and prints the numbers without committing, which is how to try a token or a
setting without publishing the result.

**5. Embed the cards** in your profile README:

```md
![Stats](./profile/stats.svg)
![Languages](./profile/languages.svg)
```

Relative paths, so GitHub serves them from your own repository.

## The stats card

Two layouts. `tiles` leads with the figure and captions it underneath; `mono` is
monospaced with leader dots, and is the only one whose column arithmetic is exact
rather than estimated, because every glyph is one advance wide. Both place rows in
columns as the count grows, and `tiles` steps its figure down, so twenty-seven metrics
stay a card rather than a poster.

| Variable | Values | Effect |
| --- | --- | --- |
| `CARD_LAYOUT` | `tiles`, `mono` | which renderer draws the card |
| `CARD_THEME` | `dark`, `light`, `auto` | `auto` ships both palettes and the viewer's setting picks |
| `CARD_ACCENT` | any hex | icons and the chart mark; empty uses the theme's |
| `CARD_ICONS` | `true`, `false` | icons beside the labels |
| `SHOW_SPARKLINE` | `true`, `false` | the contributions chart across the bottom |
| `METRIC_ORDER` | comma-separated keys | row order; unnamed metrics keep their catalogue position |

An accent that cannot be read on the surface it lands on is not drawn as given: its
lightness steps in OKLab, which leaves hue and saturation alone, until it clears a 3:1
contrast ratio, and the run says it did. `#ffff00` on the light theme becomes `#9d9900`.

### Rows

Flip a flag to add or drop a row. Only the APIs the enabled metrics need are called:
the default set costs two requests.

| Variable | Row | Source | Needs | Default |
| --- | --- | --- | --- | --- |
| `SHOW_STARS` | Total Stars Earned | GraphQL profile | — | on |
| `SHOW_FORKS` | Total Forks Earned | GraphQL profile | — | off |
| `SHOW_WATCHERS` | Total Watchers | GraphQL profile | — | off |
| `SHOW_FOLLOWERS` | Followers | GraphQL profile | — | off |
| `SHOW_FOLLOWING` | Following | GraphQL profile | — | off |
| `SHOW_STARS_GIVEN` | Stars Given | GraphQL profile | — | off |
| `SHOW_REPOS` | Repositories | GraphQL profile | — | off |
| `SHOW_GISTS` | Public Gists | GraphQL profile | — | off |
| `SHOW_ORGANIZATIONS` | Organizations | GraphQL profile | — | off |
| `SHOW_DISK_USAGE` | Repository Size | GraphQL profile | — | off |
| `SHOW_ACCOUNT_AGE` | Account Age | GraphQL profile | — | off |
| `SHOW_COMMITS` | Total Commits | REST search | `repo` | on |
| `SHOW_PRS` | Total PRs | GraphQL profile | `repo` | on |
| `SHOW_ISSUES` | Total Issues | GraphQL profile | `repo` | on |
| `SHOW_CONTRIBUTED_TO` | Contributed to | GraphQL profile | `repo` | on |
| `SHOW_PRS_MERGED` | PRs Merged | REST search | `repo` | off |
| `SHOW_PRS_MERGE_RATE` | PR Merge Rate | REST search | `repo` | off |
| `SHOW_PRS_REVIEWED` | PRs Reviewed | REST search | `repo` | off |
| `SHOW_PRS_COMMENTED` | PRs Commented | REST search | `repo` | off |
| `SHOW_ISSUES_COMMENTED` | Issues Commented | REST search | `repo` | off |
| `SHOW_DISCUSSIONS_STARTED` | Discussions Started | GraphQL profile | — | off |
| `SHOW_DISCUSSIONS_ANSWERED` | Discussions Answered | GraphQL profile | — | off |
| `SHOW_COMMITS_THIS_YEAR` | Commits (2026) | REST search | `repo` | off |
| `SHOW_CONTRIBUTIONS_THIS_YEAR` | Contributions (2026) | GraphQL profile | `repo` | off |
| `SHOW_STREAK_CURRENT` | Current Streak | contribution calendar | `repo` | off |
| `SHOW_STREAK_LONGEST` | Longest Streak | contribution calendar | `repo` | off |
| `SHOW_ACTIVE_DAYS` | Active Days | contribution calendar | `repo` | off |

`Commits (2026)` counts the calendar year, and the year is computed per run so the row
re-anchors on 1 January. The alternative, a rolling twelve months, counts a year of
activity but names no period: its meaning shifts daily and it lines up with a calendar
year once a year.

### Previewing locally

```bash
STATS_TOKEN=$(gh auth token) STATS_USERNAME=<your-login> node scripts/preview.mjs
open preview/index.html
```

Renders the card with every metric enabled and lists each row's flag beside its value,
so the selection is made by looking and then copied into the workflow.

## The languages card

| Variable | Values | Effect |
| --- | --- | --- |
| `PRS_NUMBER_TO_CALCULATE_LANGUAGES` | `all` (default) or a whole number | how many of the most recent pull requests to read |
| `EXCLUDED_LANGUAGES` | comma-separated names | languages to leave out; shares are recomputed without them |
| `MANUAL_LANGUAGES` | `Terraform 54, TypeScript 21` | declare the figures yourself; **no request is made at all** |

`MANUAL_LANGUAGES` treats its numbers as weights, so percentages and raw line counts
both work. A limit larger than the number of pull requests that exist is not an error:
it reads what there is and says so.

Reading all of them is the default because samples do not converge on the answer, they
give a different one. On one account Terraform read 57% over the 20 most recent pull
requests, 30% over 250, and 54% over all 716 — a different ranking at 250, not a
rougher one.

The blind spot is work pushed outside a pull request. On that account, 949 commits
against 716 pull requests, so coverage was high but not total. Pull requests with more
than a hundred changed files are read in part, and the run says how many.

Shares under one percent fold into `Other` rather than listing a language nobody can
see. Language colours are GitHub's, corrected for contrast per surface: `JSON` is
`#292929`, which on a dark card is a hole rather than a dot.

## What a run costs

Every run prints the requests it made, so the log states it rather than the code
implying it:

```
Requests (6):
  graphql
  graphql
  search/commits?q=author:<login>&per_page=1
  ...
```

GraphQL bills by query complexity against 5,000 points an hour, and a query costs
**1 point however much it asks for** — a six-year contribution history and a
nineteen-year one both bill 1. The languages card spends one request per hundred pull
requests. Worst realistic case, twenty thousand pull requests and every metric on, is
roughly 200 points against 5,000 an hour.

There is no monthly API quota. The only monthly meter is Actions minutes, and only
because the fork is private.

The token is not recoverable from a run. It is passed as an environment variable,
never interpolated into a URL or an error message, and the script prints its kind and
scopes but never its value.

## Licence

MIT — see `LICENSE`. Icon and colour attributions are in `NOTICE`.
