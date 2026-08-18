// Draws the adopter count as a small badge, committed as a file like everything else.
// A shields.io badge would mean a request to a third party every time somebody opens the
// page, which is the one thing this project argues against, so the badge is ours.

import { buildTheme } from "./theme.mjs";

const H = 30;
const PAD = 13;
const GAP = 7;
// 12.5px semibold and 11px letterspaced caps, estimated per glyph as everywhere else.
const NUM_CH = 7.6;
const LABEL_CH = 6.9;

export function renderAdoptersBadge(count) {
  const theme = buildTheme("auto");
  const number = String(count);
  const label = count === 1 ? "public profile" : "public profiles";
  const numberW = number.length * NUM_CH;
  const labelW = label.length * LABEL_CH;
  const width = Math.ceil(PAD * 2 + numberW + GAP + labelW);

  return `<svg
  width="${width}"
  height="${H}"
  viewBox="0 0 ${width} ${H}"
  style="max-width: 100%; height: auto;"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="Used by ${number} ${label}"
>
  <style>
${theme.css}
    .n { font: 700 13px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif; fill: var(--accent); }
    .l { font: 600 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: var(--text); letter-spacing: .05em; }
  </style>
  <rect x="0.5" y="0.5" rx="${(H - 1) / 2}" width="${width - 1}" height="${H - 1}"
        fill="var(--bg)" stroke="var(--border)"/>
  <text class="n" x="${PAD}" y="${H / 2 + 4.5}">${number}</text>
  <text class="l" x="${PAD + numberW + GAP}" y="${H / 2 + 4}">${label}</text>
</svg>
`;
}
