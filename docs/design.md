# Design decisions

## Colour is computed, not chosen

An accent is whatever hex you passed, which may be unreadable on the surface it lands on.
Its lightness steps in OKLab — which leaves hue and saturation alone — until it clears a
3:1 contrast ratio, and the run says it did: `#ffff00` on the light theme becomes
`#9d9900`. An accent that already passes is used untouched.

Language colours are GitHub's, which is what makes the card recognisable, but they were
never chosen against a dark surface. `JSON` is `#292929`, a hole rather than a dot on a
dark card, so it becomes `#616161` there. `Markdown` moves from `#083fa1` to `#285ec2`.

Identity never rests on colour alone: every language is named and carries its share, which
is also what makes borrowing GitHub's palette defensible when two of its colours sit close
together.

## The themes

`dark` and `light` take their neutrals from GitHub's own palette, so an unconfigured card
looks native. `auto` ships both and lets `prefers-color-scheme` choose, which an SVG
embedded as an image still evaluates against the viewer's setting.

Every card is framed. An unframed one carries no background, so its palette would have to
match a page it cannot see.

## The layouts

`tiles` leads with the figure and captions it underneath, stepping the figure down as the
count grows — twenty-seven rows stay a card rather than a poster.

`mono` is monospaced with leader dots. It is the only layout whose column arithmetic is
exact rather than estimated, because every glyph is one advance wide. Every other layout
estimates text width at 7.6px per character, since no font metrics are available without a
dependency.

Columns are equal width, measured on the widest row anywhere rather than the widest in
their own column, so reordering metrics cannot change the geometry: fourteen rows render
identically whatever order they arrive in.

## Responsiveness

Cards carry both an intrinsic size and a `viewBox`, plus inline `max-width: 100%; height:
auto`. Dropping the width and height leaves the size undefined and some renderers pick
their own — which is how one early version ended up centred in an empty square.

## Icons

Octicons by GitHub, MIT licensed, vendored as path data — see `NOTICE`. Language logos were
considered and rejected: they are trademarks of different owners, most with no declared
licence and several with brand guidelines of their own, which is a poor thing to
redistribute inside a repository other people fork.

A glyph is placed by optical centre rather than by baseline. A `<text>` y is its baseline
while an image's is its top edge, so aligning a glyph's foot to the baseline leaves it high
by half the cap height.
