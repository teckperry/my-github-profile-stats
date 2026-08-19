# My GitHub Profile Stats <img src="assets/adopters.svg" alt="" height="40" align="right">

<p align="center">
  <img src="examples/stats-tiles-icons.svg" width="470" alt="">
  <br>
  <img src="examples/languages.svg" width="470" alt="">
  <br>
  <sub><i>Placeholder figures — see <a href="#formats">all formats</a></i></sub>
</p>

<p align="center">
  <a href="#nobody-else-in-the-chain"><b>Nobody else in the chain</b></a>
  ·
  <a href="#setup"><b>Setup</b></a>
  ·
  <a href="#formats"><b>Formats</b></a>
  ·
  <a href="#reference"><b>Reference</b></a>
  ·
  <a href="#license"><b>License</b></a>
</p>

## Nobody else in the chain

A profile card normally means handing your account to somebody: authorizing a hosted
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

The cards carry one comment naming this project. It exists for **one** reason — counting
how many people use it, since a template copy cannot be counted the way a fork can. It
sends nothing, identifies nobody, and **you can delete it yourself**: one line, and the
card is identical. Do go ahead if you would rather — I will only be a little sad about it
:( &nbsp;[How the counting works](docs/design.md#the-signature).

Two consequences: the card **says what it measured**, and it **drops rows it cannot stand
behind** rather than printing a smaller number as though it were the answer. Both, with
measurements, in [docs/](#reference).

**You can also run it without the read token at all**, on the one Actions provides by
itself. You get thirteen rows instead of twenty-seven and the languages card says `public
pull requests`. Your call — [security.md](docs/security.md#without-the-read-token).

## Setup

### 1 · Copy this repository

**[Create your copy from the template →](https://github.com/teckperry/my-github-profile-stats/generate)** · name it,
set **Private**, create it.

<details>
<summary>Four files in the copy are mine, and you may delete them</summary>

A copy inherits the pieces that count *this* project's users. They do nothing in yours —
the counting workflow refuses to run anywhere but here — but you can remove them:

```
.github/workflows/count-adopters.yml
scripts/adopters.mjs
scripts/adopters-badge.mjs
assets/adopters.svg
```

Then drop the `<img src="assets/adopters.svg" …>` from this readme's heading, which is mine
too. Or keep the lot and ignore it; nothing breaks either way.

</details>

<details>
<summary>Why it has to be private, and why not the Fork button</summary>

Private for two reasons, and the bigger one is not secrecy. GitHub disables scheduled
workflows in a **public** repository after 60 days without activity, and this repository
never commits to itself — it writes to your profile repository — so a public copy would
quietly stop building. Private keeps the schedule alive.

It also keeps your run logs to yourself. They carry the figures and the *names* of your
token's scopes; the token itself never appears in one, and Actions masks secrets anyway.
No reason to publish either.

Not the **Fork** button. A fork has Actions switched off until you enable them and its
scheduled workflows disabled separately, so the card never builds until you find both
switches. You also cannot fork a repository into the account that already owns it. The one
thing a fork would give you is `Sync fork` for updates; a copy takes them by hand.

</details>

### 2 · Make two tokens

|  | Type | What to enable | Store it as |
| --- | --- | --- | --- |
| **Read** · optional | [classic](https://github.com/settings/tokens/new) | `repo` and `read:user` | `STATS_READ_PAT` |
| **Write** · required | [fine-grained](https://github.com/settings/personal-access-tokens/new) | **Only select repositories** → the one named after you → **Contents: Read and write** | `PROFILE_WRITE_TOKEN` |

Both go in your copy under **Settings → Secrets and variables → Actions → New repository
secret**, named exactly as above.

<details>
<summary>Why the read token is optional, and what you lose without it</summary>

Without it the workflow runs on the token Actions provides by itself, which sees only
public activity. Thirteen rows are drawn and fourteen are **dropped rather than guessed**,
and the languages card says `public pull requests`. Measured on one account, with and
without: 949 commits against 106, and 716 pull requests against 44.

The write token is not optional either way: `GITHUB_TOKEN` cannot write to another
repository, which is how the cards reach your profile. It is scoped to that one repository
and carries nothing beyond it.

The read token is the one that costs something. A classic token with `repo` has no
read-only variant, so it also grants write access to every repository you can reach —
which is why step 1 says private. See [security.md](docs/security.md).

</details>

### 3 · Run it

**Actions → Update profile cards → Run workflow.** Tick `dry_run` to print the numbers
without committing anything. After the first run it goes daily.

### 4 · Show the cards

```md
![Stats](./profile/stats.svg)
![Languages](./profile/languages.svg)
```

Relative paths, so GitHub serves them from your own repository.

Then choose what appears on them: **`card.config.json`**, in the root of your copy. One
file, every option, and your editor will explain each one as you type it. Commit, and the
next run draws it — [configuration.md](docs/configuration.md).

```bash
node scripts/config.mjs   # says what your file resolves to, and what is wrong with it
```

## Formats

| | |
| --- | --- |
| `"layout": "tiles"` | <img src="examples/stats-tiles.svg" width="320" alt=""> |
| `tiles` + `"icons": true` | <img src="examples/stats-tiles-icons.svg" width="320" alt=""> |
| `"layout": "mono"` | <img src="examples/stats-mono.svg" width="320" alt=""> |
| `mono` + `"icons": true` | <img src="examples/stats-mono-icons.svg" width="320" alt=""> |
| `"theme": "light"` | <img src="examples/stats-tiles-light.svg" width="320" alt=""> |
| `"theme": "dark"` | <img src="examples/stats-mono-dark.svg" width="320" alt=""> |
| every row on, `tiles` | <img src="examples/stats-tiles-dense.svg" width="320" alt=""> |
| every row on, `mono` | <img src="examples/stats-mono-dense.svg" width="320" alt=""> |
| languages | <img src="examples/languages.svg" width="320" alt=""> |
| languages, `"manual"` | <img src="examples/languages-manual.svg" width="320" alt=""> |

`node scripts/examples.mjs` regenerates them from placeholder data — no token needed.

## Reference

| | |
| --- | --- |
| [configuration.md](docs/configuration.md) | every option, and which token it needs |
| [security.md](docs/security.md) | the two-repository boundary, the tokens, what a run contacts |
| [metrics.md](docs/metrics.md) | what each row measures, and the rows that were removed |
| [languages.md](docs/languages.md) | why changed files rather than repository languages |
| [cost.md](docs/cost.md) | rate limits, Actions minutes, and where the real limit is |
| [design.md](docs/design.md) | color, contrast, layout and icon decisions |

## License

MIT — see [`LICENSE`](LICENSE). Attributions in [`NOTICE`](NOTICE).
