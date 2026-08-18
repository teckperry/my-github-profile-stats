# Why this exists

Everything below was measured on one real account, not reasoned about. The figures are
that account's; the conclusions are general.

## A card can be wrong without failing

Several GitHub fields do not error when a token is too narrow. They return a smaller
number, or the same number meaning something else. The same card, same code, two tokens:

| Token scopes | Commits | PRs | Contributed to | Stars |
| --- | --- | --- | --- | --- |
| `read:org`, `read:user` | 105 | 32 | 6 | 28 |
| `repo`, `read:user` | 933 | 716 | 21 | 28 |

No error either time. Somebody installing a card and seeing 105 has no way to know it
is wrong — and `stars` was correct in both, so "the token is broken" is not the lesson
either.

So every metric declares the scopes it needs, a run reads the token's real scopes, and
rows that cannot be supported are dropped with a reason:

```
Token: classic, scopes: read:org, read:user
Dropped commits: token is missing repo
Dropped prs: token is missing repo
Rows: 1
```

One row survives, and it is the one that was true.

`totalCommitContributions` is worse than under-reporting: it summed to 993 under a
narrow token and 113 under a broad one, because with the wider token the private
commits are reclassified as restricted rather than counted as public. A pair of
`publicCommits` / `privateActivity` rows was built on it and then removed — with a
partial token it does not under-report, it misattributes.

## Which scopes are actually needed

`repo` is required and has no read-only variant. `read:org` looks like it should matter
and does not: the contribution calendar returns identical figures with and without it,
measured on two tokens differing only in that scope — streaks 2 and 6, active days 360,
yearly contributions 1332, either way.

A fine-grained token cannot substitute. It is bound to a single resource owner, so it
cannot span both personal repositories and an organisation's, and it exposes no scopes,
so nothing can be checked against it.

That measurement came from an account that owns an organisation, which bounds what it
proves: an owner sees the most, so a scope that failed there fails for everyone, while a
scope that worked is not proven for an ordinary member.

## Languages: repositories do not know who wrote them

Repository language statistics describe what is inside a repository. They carry no
notion of authorship, so aggregating them credits a whole repository's composition to
anyone who touched it. Same account, three ways of asking:

| Method | First language |
| --- | --- |
| Bytes across owned repositories | **HTML 73%** — a static blog's generated output |
| Bytes across every repository contributed to | **Jupyter Notebook 49%** — a data repo committed to a few times |
| Lines changed in the account's own pull requests | **Terraform 54%** |

The first two are not imprecise, they answer a different question. Reweighting bytes
against repository counts changes the arithmetic without changing what is counted.

The blind spot of the third is work pushed outside a pull request: 949 commits against
716 pull requests on that account, so coverage was high but not total. Pull requests
with over a hundred changed files are read in part, and the run says how many.

## Samples do not converge

Reading a slice of the history gives a different answer, not a rougher one:

| Pull requests read | Terraform | YAML | TypeScript |
| --- | --- | --- | --- |
| 20 | 57% | 4% | 0% |
| 100 | 47% | 5% | 21% |
| 250 | **30%** | 23% | 21% |
| all 716 | **54%** | 16% | 12% |

At 250 the ranking is wrong, not blurry. So reading everything is the default, and the
card states its basis either way: `calculated analyzing all 716 pull requests`, or
`the latest 100 pull requests` when limited.

## A rolling year names no period

`contributionsCollection` with no window reports a rolling twelve months — measured,
2025-08-16 to 2026-08-18. It counts a year of activity but names nothing: its meaning
shifts every day and it coincides with a calendar year once a year, so the figure cannot
be cited or compared. Both yearly rows ask for the calendar year explicitly and carry it
in the label, computed per run.

## What it costs

GraphQL bills by query complexity against 5,000 points an hour, and a query costs **1
point however much it asks for**: a six-year contribution history and a nineteen-year
one both bill 1, at 101 KB and 321 KB of response. The languages card spends one request
per hundred pull requests. Worst realistic case — twenty thousand pull requests, every
row on — is roughly 200 points against 5,000 an hour.

There is no monthly API quota. The only monthly meter is Actions minutes, and only
because the fork is private: a run takes about 16 seconds, billed as one minute, so
roughly 30 of the 2,000 the Free plan includes.

Latency, not quota, is the real limit: a page of a hundred pull requests with their
files takes 2.7 to 6.6 seconds.

## Colour is computed, not chosen

An accent is whatever hex was passed, which may be unreadable on the surface it lands
on. Its lightness steps in OKLab — which leaves hue and saturation alone — until it
clears a 3:1 contrast ratio, and the run says it did: `#ffff00` on the light theme
becomes `#9d9900`.

Language colours are GitHub's, which is what makes the card recognisable, but they were
never chosen against a dark surface. `JSON` is `#292929`, a hole rather than a dot on a
dark card, so it becomes `#616161` there. Identity never rests on colour alone: every
entry is named and carries its share.

## The trust surface

Three imports, two of them Node built-ins. No `package.json`, no lockfile, no install
step. `actions/checkout`, pinned to a commit SHA, is the only action.

That is not incidental. The card this project replaced was generated by an action that
resolved its renderer from a floating npm dist-tag at run time, so pinning the action to
a commit SHA did not pin the code that received the token. Nothing here is fetched at
run time, so there is nothing to pin.

The token is passed as an environment variable, never interpolated into a URL or an
error message, and a run prints its kind and scopes but never its value. Every request
is listed at the end of a run, so the log states what was contacted rather than the code
implying it.
