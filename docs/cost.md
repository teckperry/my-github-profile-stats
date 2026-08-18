# What it costs

## Nothing, in money

GitHub's API is rate-limited, not billed. There is **no monthly API quota** — the
`rate_limit` endpoint returns hourly limits only.

The single monthly meter is Actions minutes, and only because the copy is private; public
repositories get them free. A run takes about 16 seconds but Actions rounds each job up to
the minute, so a daily schedule spends roughly **30 of the 2,000 minutes** the Free plan
includes for private repositories. No artifacts are stored.

## Requests

GraphQL bills by query complexity against 5,000 points an hour, and a query costs **1
point however much it asks for**. Measured: a six-year contribution history and a
nineteen-year one both bill 1, at 101 KB and 321 KB of response. The profile query bills 1
whether it asks for one repository or a hundred.

| | Requests |
| --- | --- |
| Stats card, default rows | 2 |
| Stats card, every row on | 6 |
| Languages card | 1 per 100 pull requests |
| Languages card, `MANUAL_LANGUAGES` | 0 |

Worst realistic case — twenty thousand pull requests and every row enabled — is roughly
200 points against 5,000 an hour, and 6 search requests against 30 a minute.

## Latency is the real limit

A page of a hundred pull requests with their files takes **2.7 to 6.6 seconds**. That, not
quota, is what makes a very long history slow:

| Pull requests | Pages | Added time | Minutes billed |
| --- | --- | --- | --- |
| 700 | 7 | ~30s | 1 |
| 5,000 | 50 | ~3.7 min | 4 |
| 20,000 | 200 | ~15 min | 15 |

Lower `PRS_NUMBER_TO_CALCULATE_LANGUAGES` if a run stops being worth its minutes, knowing
what a sample costs in accuracy.

## When a limit is hit

The search API enforces a secondary limit on bursts, which a daily run never approaches
but repeated runs within a few minutes do. Retriable statuses back off and retry rather
than failing the run.
