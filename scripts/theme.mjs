// Themes supply the neutrals; the caller supplies one accent. Defaults are GitHub's
// own palette so an unconfigured card looks native on a GitHub page.
//
// An accent is whatever hex the user passed, which may be unreadable on the surface
// it lands on. Rather than drawing it anyway, its lightness is stepped until it
// clears the contrast floor, and the run says so.

export const THEMES = {
  dark: {
    bg: "#0d1117",
    border: "#30363d",
    text: "#7d8590",
    strong: "#e6edf3",
    dim: "#6e7681",
    accent: "#2f81f7",
  },
  light: {
    bg: "#ffffff",
    border: "#d0d7de",
    text: "#59636e",
    strong: "#1f2328",
    dim: "#818b98",
    accent: "#0969da",
  },
};

const CONTRAST_FLOOR = 3;

const clamp01 = (value) => Math.min(1, Math.max(0, value));

export function parseHex(input) {
  const hex = String(input).trim().replace(/^#/, "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a color: ${input}. Use a hex like #2f81f7 or 2f81f7.`);
  }
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}

const toHex = (rgb) =>
  "#" +
  rgb
    .map((channel) => Math.round(clamp01(channel) * 255).toString(16).padStart(2, "0"))
    .join("");

// sRGB transfer function, needed both for luminance and for OKLab.
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

const luminance = (rgb) => {
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

// OKLab, so that changing lightness leaves hue and saturation where they were.
// Linear sRGB <-> OKLab matrices from Björn Ottosson's definition.
function toOklab(rgb) {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(toGamma);
}

// Step lightness towards the surface's opposite until the pair clears the floor.
// Returns the original when it already does, so a well-chosen accent is untouched.
export function ensureReadable(accentHex, surfaceHex) {
  const accent = parseHex(accentHex);
  const surface = parseHex(surfaceHex);
  if (contrast(accent, surface) >= CONTRAST_FLOOR) {
    return { hex: toHex(accent), adjusted: false };
  }

  const [, a, b] = toOklab(accent);
  const direction = luminance(surface) > 0.18 ? -1 : 1;
  let best = accent;
  for (let L = toOklab(accent)[0]; L >= 0 && L <= 1; L += direction * 0.01) {
    const candidate = fromOklab([L, a, b]).map(clamp01);
    best = candidate;
    if (contrast(candidate, surface) >= CONTRAST_FLOOR) {
      break;
    }
  }
  return { hex: toHex(best), adjusted: true, from: toHex(accent) };
}

const TOKENS = ["bg", "border", "text", "strong", "dim", "accent"];

// Colors reach the SVG as custom properties rather than literals, so one card can
// carry two palettes and pick between them at view time.
const declare = (palette) =>
  TOKENS.map((token) => `      --${token}: ${palette[token]};`).join("\n");

const resolve = (name, accentInput) => {
  const base = THEMES[name];
  const accent = ensureReadable(accentInput || base.accent, base.bg);
  return { palette: { ...base, accent: accent.hex }, report: accent };
};

// "auto" emits both palettes: light on :root, dark behind prefers-color-scheme. An
// SVG embedded as an image still evaluates that query against the viewer's setting,
// which is the only way an unframed card can sit on a page whose color it does not
// know. The accent is validated against each surface separately, so a hex that is
// readable on one and not the other is corrected only where it needs to be.
export function buildTheme(name, accentInput) {
  if (name === "auto") {
    const light = resolve("light", accentInput);
    const dark = resolve("dark", accentInput);
    return {
      ...Object.fromEntries(TOKENS.map((t) => [t, `var(--${t})`])),
      css: `    :root {\n${declare(light.palette)}\n    }
    @media (prefers-color-scheme: dark) {
      :root {\n${declare(dark.palette)}\n      }
    }`,
      accentReport: { light: light.report, dark: dark.report },
    };
  }

  if (!THEMES[name]) {
    throw new Error(
      `Unknown theme: ${name}. Use ${Object.keys(THEMES).join(", ")} or auto.`,
    );
  }
  const { palette, report } = resolve(name, accentInput);
  return {
    ...Object.fromEntries(TOKENS.map((t) => [t, `var(--${t})`])),
    css: `    :root {\n${declare(palette)}\n    }`,
    accentReport: report,
  };
}
