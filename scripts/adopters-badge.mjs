// Draws the adopter count as a line of text, committed as a file like everything else.
// A badge service would mean a request to a third party every time somebody opens the
// page, which is the one thing this project argues against, so the badge is ours.
//
// No frame and no fill: it sits beside a heading, where a pill would fight the type. The
// colours come from custom properties, so it follows the reader's scheme.

import { buildTheme } from "./theme.mjs";

const SIZE = 12.5;
const H = 20;
// Estimated per glyph, as everywhere else in this project: no font metrics are available
// without a dependency.
const CH = 6.55;
const NUM_CH = 7.4;

export function renderAdoptersBadge(count) {
  const theme = buildTheme("auto");
  const number = String(count);
  const head = "used by ";
  // A count of nobody is honest and a little sad, and says so.
  const tail = ` public ${count === 1 ? "repository" : "repositories"}${count === 0 ? " :(" : ""}`;
  const width = Math.ceil(head.length * CH + number.length * NUM_CH + tail.length * CH + 2);

  return `<svg
  width="${width}"
  height="${H}"
  viewBox="0 0 ${width} ${H}"
  style="max-width: 100%; height: auto;"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="Used by ${number} public repositories"
>
  <style>
${theme.css}
    .t { font: 400 ${SIZE}px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif; fill: var(--text); }
    .n { font: 700 ${SIZE}px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif; fill: var(--accent); }
  </style>
  <text class="t" x="0" y="14"><tspan>${head}</tspan><tspan class="n">${number}</tspan><tspan>${tail}</tspan></text>
</svg>
`;
}
