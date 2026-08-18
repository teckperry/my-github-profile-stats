# Security

## The boundary

Two repositories, and only one of them can do anything.

```
  your copy · private                      you/you · public
  ───────────────────                      ────────────────
  STATS_READ_PAT       ─── reads ──►  your account
  PROFILE_WRITE_TOKEN  ─── writes ─────►   profile/stats.svg
  the workflow                             profile/languages.svg
                                           README embeds them

  holds both secrets                       holds no secrets
```

The private copy is granted access to your account. The public repository is granted
nothing: it receives two SVG files and never learns how they were made. The only thing
crossing the boundary is a rendered image.

## The two tokens

| | Type | Reach | Optional |
| --- | --- | --- | --- |
| `STATS_READ_PAT` | classic, `repo` + `read:user` | everything your account can read | **yes** — see below |
| `PROFILE_WRITE_TOKEN` | fine-grained, `Contents: write` | one repository, yours | no |

The write token is the mandatory one and the harmless one: it can change exactly one
repository and nothing else. `GITHUB_TOKEN` cannot write to another repository, which is
why it cannot replace it.

The read token is optional and is the one that carries risk. A classic token with `repo`
has no read-only variant, so it grants write access to every repository you can reach.
That is the reason the copy holding it must be private, and the reason the project runs
without it at all if you would rather not have one.

## Without the read token

`STATS_TOKEN` falls back to the token Actions provides by itself, which sees only public
activity. Thirteen rows are drawn; the fourteen that need private access are **dropped
rather than estimated**, and the languages card says `public pull requests`.

Measured on one account, with and without: 949 commits against 106, and 716 pull
requests against 44 — almost all of that work being private.

## Why the copy must be private

Two reasons, and only the first is about secrets.

A private repository keeps the read token out of a place whose Actions logs are world
readable. And GitHub disables scheduled workflows in a **public** repository after 60 days
without repository activity — this one never commits to itself, since it writes to your
profile repository, so a public copy would stop running silently after two months. A
private copy is not subject to that rule.

Actions minutes for private repositories come out of your monthly allowance, which is what
you pay for both: about 30 of the 2,000 the Free plan includes. See [cost.md](cost.md).

## The trust surface

Three imports, two of them Node built-ins. No `package.json`, no lockfile, no install
step. `actions/checkout`, pinned to a commit SHA, is the only action.

That is not incidental. Nothing is fetched at run time, so there is nothing whose
version could change under you between one run and the next.

The token is passed as an environment variable, never interpolated into a URL or into an
error message, and a run prints its kind and scopes but never its value. Audited on a
real run's log: no token pattern appears, and the only `AUTHORIZATION` line is
`actions/checkout` configuring git, where GitHub's masking shows `***`. That masking is
a backstop rather than the defence — the value is never transformed or re-emitted, so
there is no path for it to leak past it.

## What a run contacts

Every request is recorded and listed at the end, so the log states it rather than the
code implying it:

```
Requests (6):
  graphql
  graphql
  search/commits?q=author:<login>&per_page=1
  ...
```

URLs are safe to print because the token travels in the authorization header and is
never placed in one.

To be exact rather than to oversell: the one party involved is GitHub, whose runner
executes the workflow and whose API the figures come from.
