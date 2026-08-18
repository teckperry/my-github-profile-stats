# my-github-profile-stats

Profile cards rendered by a workflow in **your** repository and committed as files.
Opening your profile requests nothing from a third party; building the cards installs
nothing.

<img src="examples/stats-tiles-icons.svg" width="470" alt="">
<img src="examples/languages.svg" width="470" alt="">

*Placeholder figures. See [all formats](#formats).*

Two things make it different from the usual: it **says what it measured**
(`calculated analyzing all 800 pull requests`), and it **drops rows it cannot stand
behind** instead of printing a smaller number as if it were the answer. Why that
matters, with measurements: **[docs/why.md](docs/why.md)**.

## How to use it

**1 · Fork this repository, then make your fork private.**
Settings → General → Danger Zone → Change visibility. The fork will hold a token that
can read your private work, and a private repository keeps both the secret and the run
logs out of public view.

**2 · Create the read token.**
[New classic token](https://github.com/settings/tokens/new) → check **`repo`** and
**`read:user`**, nothing else → Generate → copy.

> `repo` has no read-only variant, so it also grants write access to every repository
> you can reach. That is why step 1 is not optional.

**3 · Create the write token.**
[New fine-grained token](https://github.com/settings/personal-access-tokens/new) →
Repository access: **Only select repositories** → pick the repository named after you →
Permissions → Repository → **Contents: Read and write** → Generate → copy.

**4 · Store both in your fork.**
Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
| --- | --- |
| `STATS_READ_PAT` | the classic token from step 2 |
| `PROFILE_WRITE_TOKEN` | the fine-grained token from step 3 |

**5 · Run it.**
Actions → *Update profile cards* → Run workflow. It writes `profile/stats.svg` and
`profile/languages.svg` into your profile repository, then runs itself daily.

> Tick **dry_run** to print the numbers without committing — the way to try a token or
> a setting before publishing the result.

**6 · Embed the cards** in your profile README:

```md
![Stats](./profile/stats.svg)
![Languages](./profile/languages.svg)
```

**7 · Choose what to show.** Edit the `env:` block in
`.github/workflows/update-profile-cards.yml`. Every option is listed there with a
comment, and the reference is [below](#configuration).

To pick rows by looking at them rather than reading a table:

```bash
STATS_TOKEN=$(gh auth token) STATS_USERNAME=<your-login> node scripts/preview.mjs
open preview/index.html
```

## Formats

| | |
| --- | --- |
| `CARD_LAYOUT=tiles` | <img src="examples/stats-tiles.svg" width="330" alt=""> |
| `CARD_LAYOUT=tiles` + `CARD_ICONS=true` | <img src="examples/stats-tiles-icons.svg" width="330" alt=""> |
| `CARD_LAYOUT=mono` | <img src="examples/stats-mono.svg" width="330" alt=""> |
| `CARD_LAYOUT=mono` + `CARD_ICONS=true` | <img src="examples/stats-mono-icons.svg" width="330" alt=""> |
| `CARD_THEME=light` | <img src="examples/stats-tiles-light.svg" width="330" alt=""> |
| `CARD_THEME=dark` | <img src="examples/stats-mono-dark.svg" width="330" alt=""> |
| every row on, `tiles` | <img src="examples/stats-tiles-dense.svg" width="330" alt=""> |
| every row on, `mono` | <img src="examples/stats-mono-dense.svg" width="330" alt=""> |
| languages | <img src="examples/languages.svg" width="330" alt=""> |
| languages, `MANUAL_LANGUAGES` | <img src="examples/languages-manual.svg" width="330" alt=""> |

Regenerate them with `node scripts/examples.mjs` — placeholder data, no token needed.

## Configuration

### Look

| Variable | Values |
| --- | --- |
| `CARD_LAYOUT` | `tiles`, `mono` |
| `CARD_THEME` | `dark`, `light`, `auto` — follows the viewer's setting |
| `CARD_ACCENT` | any hex; empty uses the theme's own |
| `CARD_ICONS` | `true`, `false` |
| `SHOW_SPARKLINE` | `true`, `false` |
| `METRIC_ORDER` | comma-separated metric keys, in the order you want them |

An accent that cannot be read on the surface it lands on is corrected rather than
drawn as given, and the run says so.

### Rows — on by default

| Variable | Row |
| --- | --- |
| `SHOW_STARS` | Total Stars Earned |
| `SHOW_COMMITS` | Total Commits |
| `SHOW_PRS` | Total PRs |
| `SHOW_ISSUES` | Total Issues |
| `SHOW_CONTRIBUTED_TO` | Contributed to |

### Rows — off by default

| Variable | Row |
| --- | --- |
| `SHOW_FORKS` | Total Forks Earned |
| `SHOW_WATCHERS` | Total Watchers |
| `SHOW_FOLLOWERS` | Followers |
| `SHOW_FOLLOWING` | Following |
| `SHOW_STARS_GIVEN` | Stars Given |
| `SHOW_REPOS` | Repositories |
| `SHOW_GISTS` | Public Gists |
| `SHOW_ORGANIZATIONS` | Organizations |
| `SHOW_DISK_USAGE` | Repository Size |
| `SHOW_ACCOUNT_AGE` | Account Age |
| `SHOW_PRS_MERGED` | PRs Merged |
| `SHOW_PRS_MERGE_RATE` | PR Merge Rate |
| `SHOW_PRS_REVIEWED` | PRs Reviewed |
| `SHOW_PRS_COMMENTED` | PRs Commented |
| `SHOW_ISSUES_COMMENTED` | Issues Commented |
| `SHOW_DISCUSSIONS_STARTED` | Discussions Started |
| `SHOW_DISCUSSIONS_ANSWERED` | Discussions Answered |
| `SHOW_COMMITS_THIS_YEAR` | Commits (YYYY) |
| `SHOW_CONTRIBUTIONS_THIS_YEAR` | Contributions (YYYY) |
| `SHOW_STREAK_CURRENT` | Current Streak |
| `SHOW_STREAK_LONGEST` | Longest Streak |
| `SHOW_ACTIVE_DAYS` | Active Days |

Only the APIs the enabled rows need are called: the default set costs two requests.
`YYYY` is the current year, computed per run.

### Languages

| Variable | Values |
| --- | --- |
| `PRS_NUMBER_TO_CALCULATE_LANGUAGES` | `all` (default), or how many recent pull requests to read |
| `EXCLUDED_LANGUAGES` | comma-separated names to leave out |
| `MANUAL_LANGUAGES` | `Terraform 54, TypeScript 21` — declared outright, **no request made** |

A limit larger than your history is not an error: it reads what exists and says so.

## Licence

MIT — see [`LICENSE`](LICENSE). Icon and colour attributions in [`NOTICE`](NOTICE).
