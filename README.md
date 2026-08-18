# My GitHub Profile Stats

<p align="center">
  <img src="examples/stats-tiles-icons.svg" width="470" alt="">
  <br>
  <img src="examples/languages.svg" width="470" alt="">
  <br>
  <sub><i>Placeholder figures — see <a href="#formats">all formats</a></i></sub>
</p>

## Nobody else in the chain

A profile card normally means handing your account to somebody: authorising a hosted
instance to read your private contributions, deploying your own copy of one, or running an
action that downloads its renderer at build time and runs it with your token in the
environment.

This is two repositories.

```
  your copy · private                      you/you · public
  ───────────────────                      ────────────────
  STATS_READ_PAT       ─── reads ──►  your account
  PROFILE_WRITE_TOKEN  ─── writes ─────►   profile/stats.svg
  the workflow                             profile/languages.svg
                                           README embeds them

  holds both secrets                       holds no secrets
```

The private one does the work. The public one receives two SVG files and holds nothing.
Nothing is installed at build time — no `package.json`, no lockfile — and nothing is
requested from anyone when a visitor opens your profile, because the card is a file in your
own repository.

Two consequences: the card **says what it measured**, and it **drops rows it cannot stand
behind** rather than printing a smaller number as though it were the answer. Both, with
measurements, in [docs/](#reference).

**You can also run it without the read token at all**, on the one Actions provides by
itself. You get thirteen rows instead of twenty-seven and the languages card says `public
pull requests`. Your call — [security.md](docs/security.md#without-the-read-token).

## Setup

**1 · Make your own copy.**

**[Create your copy from this template](https://github.com/teckperry/my-github-profile-stats/generate)** —
or the **Use this template** button at the top of this page. Give it a name, set
**Private**, and create it.

Private matters twice over. It keeps your token out of a repository whose Actions logs
anyone can read, and it keeps the schedule running: GitHub disables scheduled workflows in
a **public** repository after 60 days without activity, and this one never commits to
itself — it writes to your profile repository instead.

> Not the **Fork** button. A fork has Actions switched off until you enable them and its
> scheduled workflows disabled separately, so the card never builds until you find both
> switches. A template copy is a normal repository with neither problem. The one thing a
> fork gives you is `Sync fork` for updates; a copy takes them by hand.

**2 · Create the read token** — optional, see above.
[New classic token](https://github.com/settings/tokens/new) → check **`repo`** and
**`read:user`** → Generate → copy.

**3 · Create the write token.**
[New fine-grained token](https://github.com/settings/personal-access-tokens/new) →
Repository access: **Only select repositories** → the one named after you → Permissions →
Repository → **Contents: Read and write** → Generate → copy.

**4 · Store them in your copy.**
Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
| --- | --- |
| `STATS_READ_PAT` | the token from step 2, if you made one |
| `PROFILE_WRITE_TOKEN` | the token from step 3 |

**5 · Run it.** Actions → *Update profile cards* → Run workflow. Tick **dry_run** to print
the numbers without committing. After that it runs daily.

**6 · Embed the cards** in your profile README:

```md
![Stats](./profile/stats.svg)
![Languages](./profile/languages.svg)
```

**7 · Choose what to show** in the workflow's `env:` block —
[configuration.md](docs/configuration.md).

## Formats

| | |
| --- | --- |
| `CARD_LAYOUT=tiles` | <img src="examples/stats-tiles.svg" width="320" alt=""> |
| `tiles` + `CARD_ICONS=true` | <img src="examples/stats-tiles-icons.svg" width="320" alt=""> |
| `CARD_LAYOUT=mono` | <img src="examples/stats-mono.svg" width="320" alt=""> |
| `mono` + `CARD_ICONS=true` | <img src="examples/stats-mono-icons.svg" width="320" alt=""> |
| `CARD_THEME=light` | <img src="examples/stats-tiles-light.svg" width="320" alt=""> |
| `CARD_THEME=dark` | <img src="examples/stats-mono-dark.svg" width="320" alt=""> |
| every row on, `tiles` | <img src="examples/stats-tiles-dense.svg" width="320" alt=""> |
| every row on, `mono` | <img src="examples/stats-mono-dense.svg" width="320" alt=""> |
| languages | <img src="examples/languages.svg" width="320" alt=""> |
| languages, `MANUAL_LANGUAGES` | <img src="examples/languages-manual.svg" width="320" alt=""> |

`node scripts/examples.mjs` regenerates them from placeholder data — no token needed.

## Reference

| | |
| --- | --- |
| [configuration.md](docs/configuration.md) | every option, and which token it needs |
| [security.md](docs/security.md) | the two-repository boundary, the tokens, what a run contacts |
| [metrics.md](docs/metrics.md) | what each row measures, and the rows that were removed |
| [languages.md](docs/languages.md) | why changed files rather than repository languages |
| [cost.md](docs/cost.md) | rate limits, Actions minutes, and where the real limit is |
| [design.md](docs/design.md) | colour, contrast, layout and icon decisions |

## Licence

MIT — see [`LICENSE`](LICENSE). Attributions in [`NOTICE`](NOTICE).
