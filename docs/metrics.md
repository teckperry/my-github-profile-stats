# What the rows measure

## A card can be wrong without failing

Several GitHub fields do not error when a token is too narrow. They return a smaller
number, or the same number meaning something else. The same card, same code, two tokens:

| Token scopes | Commits | PRs | Contributed to | Stars |
| --- | --- | --- | --- | --- |
| `read:org`, `read:user` | 105 | 32 | 6 | 28 |
| `repo`, `read:user` | 933 | 716 | 21 | 28 |

No error either time. Somebody seeing 105 has no way to know it is wrong — and `stars`
was correct in both, so "the token is broken" is not the lesson either.

So every metric declares the scopes it needs, a run reads the token's real scopes, and
rows that cannot be supported are dropped with a reason:

```
Token: classic, scopes: read:org, read:user
Dropped commits: token is missing repo
Dropped prs: token is missing repo
Rows: 1
```

One row survives, and it is the one that was true.

A token that exposes **no** scopes — the built-in one, or any fine-grained token —
cannot be checked at all. Those rows are dropped too, on the rule that what cannot be
confirmed is not claimed.

## The yearly rows name a calendar year

`contributionsCollection` with no window reports a rolling twelve months — measured,
2025-08-16 to 2026-08-18. It counts a year of activity but names no period: its meaning
shifts every day and it coincides with a calendar year once a year, so the figure cannot
be cited or compared. Both yearly rows ask for the calendar year explicitly and carry it
in the label, computed per run, so they re-anchor on 1 January.

## A figure that was removed

`totalCommitContributions` summed to 993 under a narrow token and 113 under a broad one:
with the wider token the private commits are reclassified as restricted rather than
counted as public. A `publicCommits` / `privateActivity` pair was built on it and then
removed — with a partial token it does not under-report, it misattributes.

Contribution fields also have no per-type breakdown for private work, which all lands in
one opaque total. So a per-type contribution count only ever sees public activity: review
contributions read 1 against 612 from the search index. Rows built that way were removed
rather than relabeled.

## Which scopes are needed

`repo` is required for private work and has no read-only variant.

`read:org` looks like it should matter and does not: the contribution calendar returns
identical figures with and without it, measured on two tokens differing only in that
scope — streaks 2 and 6, active days 360, yearly contributions 1332, either way.

A fine-grained token cannot substitute. It is bound to a single resource owner, so it
cannot span both personal repositories and an organization's.

That measurement came from an account that owns an organization, which bounds what it
proves: an owner sees the most, so a scope that failed there fails for everyone, while a
scope that worked is not proven for an ordinary member.
