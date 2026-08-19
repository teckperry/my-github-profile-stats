# How languages are counted

From the lines you changed in your own pull requests, not from the languages present in
repositories you are attached to.

## Repositories do not know who wrote them

Repository language statistics describe what is inside a repository. They carry no notion
of authorship, so aggregating them credits a whole repository's composition to anyone who
touched it. Same account, three ways of asking:

| Method | First language |
| --- | --- |
| Bytes across owned repositories | **HTML 73%** — a static blog's generated output |
| Bytes across every repository contributed to | **Jupyter Notebook 49%** — a data repo committed to a few times |
| Lines changed in the account's own pull requests | **Terraform 54%** |

The first two are not imprecise, they answer a different question. Reweighting bytes
against repository counts changes the arithmetic without changing what is counted.

There is a further trap in the second row: `ownerAffiliations` does not return the
organization repositories you actually work in when access arrives through a team. On that
account it missed the repository holding 2 MB of Terraform entirely.

## The blind spot

Work pushed outside a pull request is invisible: 949 commits against 716 pull requests on
that account, so coverage was high but not total.

Pull requests with more than a hundred changed files are read in part, and a run says how
many. Extensions with no recognized language count as `Other` rather than vanishing, and a
run says how many lines that was.

## Samples do not converge

Reading a slice of the history gives a different answer, not a rougher one:

| Pull requests read | Terraform | YAML | TypeScript |
| --- | --- | --- | --- |
| 20 | 57% | 4% | 0% |
| 100 | 47% | 5% | 21% |
| 250 | **30%** | 23% | 21% |
| all 716 | **54%** | 16% | 12% |

At 250 the ranking is wrong, not blurry. So `languages.pullRequestsToRead` defaults
to `all`, and the card states its basis either way: `calculated analyzing all 716 pull
requests`, or `the latest 100 pull requests` when limited.

A limit larger than the history is not an error: it reads what exists and says so.

## Declaring them instead

`languages.manual` takes `{"Terraform": 54, "TypeScript": 21}` and makes **no request of
any kind**. The numbers are weights, so percentages and raw line counts both work.
