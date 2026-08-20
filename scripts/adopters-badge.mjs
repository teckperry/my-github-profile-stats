// Draws the adopter count as a line of text, committed as a file like everything else.
// A badge service would mean a request to a third party every time somebody opens the
// page, which is the one thing this project argues against, so the badge is ours.
//
// No frame and no fill: it sits beside a heading, where a pill would fight the type. The
// colors come from custom properties, so it follows the reader's scheme.

import { buildTheme } from "./theme.mjs";

const SIZE = 12.5;
// Taller than the text needs. align="right" makes the image a float, and a float sits at
// the top of the line box rather than at the middle of it, so a short badge rides above a
// large heading. Padding the canvas and centring the text inside puts the words where the
// heading's own words are, without CSS -- which a readme would have stripped anyway.
const H = 40;
// Estimated per glyph, as everywhere else in this project: no font metrics are available
// without a dependency.
const CH = 6.55;
const NUM_CH = 7.4;

export function renderAdoptersBadge(count) {
  const theme = buildTheme("auto");
  // A plus, not a bare number. The count is of what code search has indexed, and indexing
  // is neither immediate nor guaranteed, so the figure is a floor rather than a total --
  // measured once at one against a true two. Zero is a floor of nothing, so it stays zero.
  const number = count === 0 ? "0" : `${count}+`;
  const head = "used by ";
  // A count of nobody is honest and a little sad, and says so.
  const tail = ` public repositories${count === 0 ? " :(" : ""}`;
  const width = Math.ceil(head.length * CH + number.length * NUM_CH + tail.length * CH + 2);

  return `<svg
  width="${width}"
  height="${H}"
  viewBox="0 0 ${width} ${H}"
  style="max-width: 100%; height: auto;"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="Used by ${count === 0 ? "0 public repositories" : `at least ${count} public ${count === 1 ? "repository" : "repositories"}`}"
>
  <style>
${theme.css}
    .t { font: 400 ${SIZE}px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif; fill: var(--text); }
    .n { font: 700 ${SIZE}px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif; fill: var(--accent); }
  </style>
  <text class="t" x="0" y="${(H / 2 + SIZE * 0.35).toFixed(1)}"><tspan>${head}</tspan><tspan class="n">${number}</tspan><tspan>${tail}</tspan></text>
</svg>
`;
}
