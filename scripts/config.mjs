// What the cards show is configured in card.config.json, not in the workflow.
//
// The reason is mechanical rather than aesthetic. A token without the `workflow` scope
// cannot write to `.github/workflows/**` -- GitHub answers 404, and no permission in the
// `permissions:` block grants it -- so an automated update can change every file in a
// copy of this repository except a workflow. Anything left in the workflow could never
// be updated for you. Anything kept here can.
//
// Defaults live in DEFAULTS below and card.config.json only overrides them, so a file
// may name one key, or none, and still be valid. That is what keeps an old copy working
// after a release adds an option -- and it is why a released card.config.json is never
// edited upstream: the file belongs to whoever copied the repository, and changing it
// here would put a merge conflict in front of them.
//
// Environment variables still win over the file. That is for the local tools --
// scripts/preview.mjs renders every row by setting SHOW_ALL, touching nobody's file --
// and it means a copy still carrying the old all-in-the-workflow setup keeps rendering
// exactly what it rendered before.
//
// Env:
//   CARD_CONFIG   path to the file; defaults to card.config.json beside this repository
//   PROFILE_DIR   where the profile repository is checked out; outputs resolve inside it
//
// Run it directly to check a file before a run spends an API call on it:
//   node scripts/config.mjs

import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { ICON_DEFAULTS, LAYOUTS } from "./layouts.mjs";
import { METRICS, envFlag } from "./metrics.mjs";
import { VERSION } from "./version.mjs";
import { parseHex } from "./theme.mjs";
import { parseManual } from "./languages.mjs";

// `null` means "decide later": no accent is the theme's own, no icons setting is the
// layout's default, no metric list is the catalogue's, no manual languages means measure.
const DEFAULTS = {
  theme: "dark",
  accent: null,
  stats: {
    enabled: true,
    output: "profile/stats.svg",
    layout: "tiles",
    icons: null,
    sparkline: true,
    metrics: null,
  },
  languages: {
    enabled: true,
    output: "profile/languages.svg",
    pullRequestsToRead: "all",
    exclude: [],
    manual: null,
    top: 6,
  },
};

const THEME_NAMES = ["dark", "light", "auto"];
const LAYOUT_NAMES = Object.keys(LAYOUTS);
const METRIC_KEYS = METRICS.map((metric) => metric.key);
const MAX_LANGUAGES = 12;

const CONFIG_PATH =
  process.env.CARD_CONFIG || fileURLToPath(new URL("../card.config.json", import.meta.url));

// Named in every message. Relative to where the run started when that is shorter, so a
// log reads `generator/card.config.json` rather than a runner's absolute path.
const displayPath = (path) => {
  const near = relative(process.cwd(), path);
  return near && !near.startsWith("..") ? near : path;
};

const isTruthy = (value) => /^(true|1|yes|on)$/i.test(value ?? "");

const envValue = (name) => {
  const raw = name ? process.env[name] : undefined;
  return raw === undefined || raw.trim() === "" ? undefined : raw.trim();
};

const envBool = (name) => {
  const raw = envValue(name);
  return raw === undefined ? undefined : isTruthy(raw);
};

// Separate from a crash, so the entry point can print a mistake in a file as a message
// about that file and keep stack traces for actual defects.
export class ConfigError extends Error {}

const bad = (label, message) => {
  throw new ConfigError(`${label}: ${message}`);
};

const show = (value) => JSON.stringify(value) ?? String(value);

function asBoolean(value, label) {
  if (typeof value !== "boolean") {
    bad(label, `expected true or false, got ${show(value)}`);
  }
  return value;
}

function asEnum(value, label, allowed) {
  if (typeof value !== "string" || !allowed.includes(value)) {
    bad(label, `expected one of ${allowed.join(", ")}, got ${show(value)}`);
  }
  return value;
}

// An output path resolves inside the profile repository's checkout, so one that climbs
// out of it, or names an absolute location, would write somewhere nobody asked for.
function asOutputPath(value, label) {
  const climbs = typeof value === "string" && value.split(/[/\\]/).includes("..");
  if (typeof value !== "string" || !value.trim() || isAbsolute(value) || climbs) {
    bad(label, `expected a relative path inside the profile repository, got ${show(value)}`);
  }
  return value.trim();
}

function asAccent(value, label) {
  if (value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    bad(label, `expected a hex color or null, got ${show(value)}`);
  }
  try {
    parseHex(value);
  } catch (error) {
    bad(label, error.message.replace(/^Not a color: /, "not a color: "));
  }
  return value;
}

function asPullRequests(value, label) {
  if (typeof value === "string" && value.trim().toLowerCase() === "all") {
    return "all";
  }
  const count = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(count) || count < 1) {
    bad(label, `expected "all" or a whole number of pull requests, got ${show(value)}`);
  }
  return count;
}

function asNames(value, label) {
  if (typeof value === "string") {
    return value.split(",").map((name) => name.trim()).filter(Boolean);
  }
  if (!Array.isArray(value) || value.some((name) => typeof name !== "string")) {
    bad(label, `expected an array of names, got ${show(value)}`);
  }
  return value.map((name) => name.trim()).filter(Boolean);
}

// Weights, not percentages: {"Terraform": 54} and {"Terraform": 5400} draw the same
// card, because the card shares out whatever it is given.
function asManual(value, label) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return parseManual(value);
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    bad(label, `expected an object like {"Terraform": 54}, got ${show(value)}`);
  }
  const entries = Object.entries(value);
  for (const [name, weight] of entries) {
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) {
      bad(`${label}.${name}`, `expected a positive number, got ${show(weight)}`);
    }
  }
  // Declaring nothing is not declaring zero languages: an empty object means measure.
  return entries.length ? new Map(entries) : null;
}

function asTop(value, label) {
  const count = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(count) || count < 1 || count > MAX_LANGUAGES) {
    bad(label, `expected a whole number from 1 to ${MAX_LANGUAGES}, got ${show(value)}`);
  }
  return count;
}

function asMetrics(value, label) {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Array.isArray(value)) {
    bad(label, `expected an array of metric keys, got ${show(value)}`);
  }
  const unknown = value.filter((key) => !METRIC_KEYS.includes(key));
  if (unknown.length) {
    bad(
      label,
      `no such metric: ${unknown.map(show).join(", ")}\n  available: ${METRIC_KEYS.join(", ")}`,
    );
  }
  return [...new Set(value)];
}

// A key nobody reads is worse than a failed run. `showStars` instead of `stars` would
// leave the row off the card with nothing anywhere to say why, which is the same
// silent-wrong-answer failure the rest of this project exists to avoid.
function rejectUnknownKeys(raw, label) {
  const top = Object.keys(DEFAULTS);
  const sections = { stats: DEFAULTS.stats, languages: DEFAULTS.languages };
  const problems = [];

  for (const key of Object.keys(raw)) {
    if (key !== "$schema" && !top.includes(key)) {
      problems.push([key, top]);
    }
  }
  for (const [name, defaults] of Object.entries(sections)) {
    const section = raw[name];
    if (section === undefined) {
      continue;
    }
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
      bad(`${label}: ${name}`, `expected an object, got ${show(section)}`);
    }
    for (const key of Object.keys(section)) {
      if (!(key in defaults)) {
        problems.push([`${name}.${key}`, Object.keys(defaults).map((k) => `${name}.${k}`)]);
      }
    }
  }

  if (problems.length) {
    const lines = problems.map(([path, allowed]) => `  ${path} — try one of: ${allowed.join(", ")}`);
    throw new ConfigError(
      `${label}: unknown option${problems.length > 1 ? "s" : ""}\n${lines.join("\n")}`,
    );
  }
}

async function readConfigFile(path, label) {
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    // A missing file is not a failure: every option has a default, so a copy that
    // deleted it renders the default cards rather than nothing at all.
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ConfigError(`${label} is not valid JSON: ${error.message}`);
  }
}

let cached = null;

export async function loadConfig() {
  if (cached) {
    return cached;
  }

  const label = displayPath(CONFIG_PATH);
  const file = await readConfigFile(CONFIG_PATH, label);
  const raw = file ?? {};
  rejectUnknownKeys(raw, label);

  const stats = raw.stats ?? {};
  const languages = raw.languages ?? {};
  const at = (path) => `${label}: ${path}`;
  const profileDir = envValue("PROFILE_DIR");

  // Precedence in one place: the environment, then the file, then the default. Whichever
  // wins carries the name of where it came from, so a complaint blames the right place.
  const checked = (check, envName, given, path, fallback, ...rest) => {
    const fromEnv = envValue(envName);
    return fromEnv !== undefined
      ? check(fromEnv, envName, ...rest)
      : check(given === undefined ? fallback : given, at(path), ...rest);
  };

  const flag = (envName, given, path, fallback) =>
    envBool(envName) ?? (given === undefined ? fallback : asBoolean(given, at(path)));

  // Set from the environment, an output path is taken exactly as given -- that is how
  // the local tools write to preview/ rather than to a profile repository they have not
  // checked out.
  const output = (envName, given, path, fallback) => {
    const fromEnv = envValue(envName);
    if (fromEnv !== undefined) {
      return fromEnv;
    }
    const inRepo = given === undefined ? fallback : asOutputPath(given, at(path));
    return profileDir ? join(profileDir, inRepo) : inRepo;
  };

  const layout = checked(
    asEnum,
    "CARD_LAYOUT",
    stats.layout,
    "stats.layout",
    DEFAULTS.stats.layout,
    LAYOUT_NAMES,
  );

  // No icons setting means the layout decides, which is why this is not a plain flag.
  const iconsGiven = envBool("CARD_ICONS") ?? stats.icons ?? DEFAULTS.stats.icons;

  cached = {
    version: VERSION,
    file: label,
    present: file !== null,
    theme: checked(asEnum, "CARD_THEME", raw.theme, "theme", DEFAULTS.theme, THEME_NAMES),
    accent: checked(asAccent, "CARD_ACCENT", raw.accent, "accent", DEFAULTS.accent),
    stats: {
      enabled: flag("SHOW_STATS_CARD", stats.enabled, "stats.enabled", DEFAULTS.stats.enabled),
      output: output("CARD_OUTPUT", stats.output, "stats.output", DEFAULTS.stats.output),
      layout,
      icons: iconsGiven === null ? ICON_DEFAULTS[layout] : asBoolean(iconsGiven, at("stats.icons")),
      sparkline: flag("SHOW_SPARKLINE", stats.sparkline, "stats.sparkline", DEFAULTS.stats.sparkline),
      metrics: resolveMetrics(stats.metrics, at("stats.metrics")),
    },
    languages: {
      enabled: flag(
        "SHOW_LANGUAGES_CARD",
        languages.enabled,
        "languages.enabled",
        DEFAULTS.languages.enabled,
      ),
      output: output(
        "LANGUAGES_OUTPUT",
        languages.output,
        "languages.output",
        DEFAULTS.languages.output,
      ),
      pullRequestsToRead: checked(
        asPullRequests,
        "PRS_NUMBER_TO_CALCULATE_LANGUAGES",
        languages.pullRequestsToRead,
        "languages.pullRequestsToRead",
        DEFAULTS.languages.pullRequestsToRead,
      ),
      exclude: checked(
        asNames,
        "EXCLUDED_LANGUAGES",
        languages.exclude,
        "languages.exclude",
        DEFAULTS.languages.exclude,
      ),
      manual: checked(
        asManual,
        "MANUAL_LANGUAGES",
        languages.manual,
        "languages.manual",
        DEFAULTS.languages.manual,
      ),
      top: checked(asTop, "LANGUAGES_TOP", languages.top, "languages.top", DEFAULTS.languages.top),
    },
  };

  return cached;
}

// The list both enables and orders: a row is on the card because it is named, where it
// is named. Absent, the catalogue's own defaults apply. SHOW_<METRIC> and METRIC_ORDER
// still override, so a copy that has not moved its settings out of the workflow yet
// renders what it always did.
function resolveMetrics(given, label) {
  const listed =
    asMetrics(given, label) ??
    METRICS.filter((metric) => metric.enabled).map((metric) => metric.key);

  const ordering = envValue("METRIC_ORDER")
    ?.split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  const unknown = (ordering ?? []).filter((key) => !METRIC_KEYS.includes(key));
  if (unknown.length) {
    console.log(`METRIC_ORDER names no such metric: ${unknown.join(", ")}`);
  }

  const everything = isTruthy(process.env.SHOW_ALL);
  const rank = new Map((ordering ?? listed).map((key, index) => [key, index]));

  // Filtering the catalogue and then sorting by rank leaves anything unranked in
  // catalogue order, after the rows that were named.
  return METRICS.filter(
    (metric) => envBool(envFlag(metric.key)) ?? (everything || listed.includes(metric.key)),
  )
    .sort((a, b) => (rank.get(a.key) ?? Infinity) - (rank.get(b.key) ?? Infinity))
    .map((metric) => metric.key);
}

// Run directly to see what a file resolves to, and to have it rejected here rather than
// three API calls into a run.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let config;
  try {
    config = await loadConfig();
  } catch (error) {
    if (!(error instanceof ConfigError)) {
      throw error;
    }
    console.error(`\n${error.message}\n`);
    process.exit(1);
  }

  console.log(`my-github-profile-stats v${config.version}`);
  console.log(config.present ? `Read ${config.file}` : `No ${config.file}; using defaults`);
  console.log(
    JSON.stringify(
      {
        ...config,
        languages: {
          ...config.languages,
          manual: config.languages.manual ? Object.fromEntries(config.languages.manual) : null,
        },
      },
      null,
      2,
    ),
  );

  const off = METRIC_KEYS.filter((key) => !config.stats.metrics.includes(key));
  if (off.length) {
    console.log(`\nAvailable but not on the card: ${off.join(", ")}`);
  }
}
