// Draws the languages card. Kept apart from fetching so the same renderer serves a
// measured run and a placeholder example.

import { composeCard } from "./layouts.mjs";
import { THEMES, ensureReadable } from "./theme.mjs";

const LAYOUT = {
  width: 467,
  pad: 22,
  legendRow: 21,
  legendCols: 2,
  dot: 8,
  gapBeforeNote: 16,
};

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const pct = (share) => `${share.toFixed(1)}%`;

// Language colors are GitHub's, which is what makes the bar recognisable, but they
// were never chosen against a dark surface: JSON is #292929, which on #0d1117 reads as
// a hole in the bar rather than a segment. Each one goes through the same contrast
// correction as the accent, per surface, and is emitted as a variable so one card can
// carry both sets.
function paletteCss(segments, themeName) {
  
  const forSurface = (bg) =>
    segments
      .map((s, i) => `      --lang-${i}: ${ensureReadable(s.color, bg).hex};`)
      .join("\n");

  if (themeName === "auto") {
    return `    :root {\n${forSurface(THEMES.light.bg)}\n    }
    @media (prefers-color-scheme: dark) {
      :root {\n${forSurface(THEMES.dark.bg)}\n      }
    }`;
  }
  return `    :root {\n${forSurface(THEMES[themeName].bg)}\n    }`;
}

export function renderLanguagesCard(segments, note, theme, themeName, title) {
  const inner = LAYOUT.width - LAYOUT.pad * 2;
  const rows = Math.ceil(segments.length / LAYOUT.legendCols);
  const colWidth = inner / LAYOUT.legendCols;
  const noteTop = rows * LAYOUT.legendRow + LAYOUT.gapBeforeNote;
  const height = LAYOUT.pad * 2 + noteTop + (note ? 4 : -LAYOUT.gapBeforeNote);

  // Every segment is named and given its share, so identity never rests on color
  // alone -- which is also what makes borrowing GitHub's palette defensible.
  const legend = segments
    .map((s, i) => {
      const col = i % LAYOUT.legendCols;
      const row = Math.floor(i / LAYOUT.legendCols);
      const cx = col * colWidth;
      return `      <g class="entry" style="animation-delay: ${120 + i * 70}ms" transform="translate(${cx.toFixed(1)}, ${row * LAYOUT.legendRow})">
        <circle cx="${LAYOUT.dot / 2}" cy="7.5" r="${LAYOUT.dot / 2}" fill="var(--lang-${i})"/>
        <text class="name" x="${LAYOUT.dot + 8}" y="11">${escape(s.name)}</text>
        <text class="share" x="${(colWidth - 12).toFixed(1)}" y="11" text-anchor="end">${pct(s.share)}</text>
      </g>`;
    })
    .join("\n");

  return composeCard({
    width: LAYOUT.width,
    height: Math.ceil(height),
    theme,
    title: title,
    desc: segments.map((s) => `${s.name}: ${pct(s.share)}`).join(", ") + (note ? `. ${note}` : ""),
    style: `${theme.css}
${paletteCss(segments, themeName)}
    .name { font: 600 12.5px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif; fill: ${theme.strong}; }
    .share { font: 400 12.5px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif; fill: ${theme.text}; }
    .note { font: 400 10.5px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.dim}; }
    .entry, .note { opacity: 0; animation: fadeIn .3s ease-out forwards; }
    .note { animation-delay: ${200 + segments.length * 70}ms; }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`,
    body: `  <g transform="translate(${LAYOUT.pad}, ${LAYOUT.pad})">
    <g>
${legend}
    </g>${note ? `\n    <text class="note" x="0" y="${noteTop}">${escape(note)}</text>` : ""}
  </g>`,
  });
}

