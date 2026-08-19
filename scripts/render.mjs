// The one command the workflow runs.
//
// Both cards from one configuration file, on purpose: it means a release can add a
// metric, an option or a whole card without anything having to change in
// .github/workflows/**, which is the one place an update cannot reach. A token without
// the `workflow` scope is refused there, and no permission grants it.
//
// Env: STATS_TOKEN, STATS_USERNAME, PROFILE_DIR -- see scripts/config.mjs
//
//   node scripts/render.mjs

import { ConfigError, loadConfig } from "./config.mjs";

let config;
try {
  config = await loadConfig();
} catch (error) {
  // A mistake in card.config.json is not a bug in the generator, and it costs nothing to
  // say so before a single request is made. Anything else keeps its stack trace.
  if (!(error instanceof ConfigError)) {
    throw error;
  }
  console.error(`\n${error.message}\n`);
  console.error("Check it with: node scripts/config.mjs");
  process.exit(1);
}

console.log(`my-github-profile-stats v${config.version}`);
console.log(config.present ? `Config: ${config.file}` : `Config: ${config.file} (absent, defaults used)`);

if (!config.stats.enabled && !config.languages.enabled) {
  throw new Error(`Nothing to render: both cards are turned off in ${config.file}.`);
}

// One after the other, so the second card is not requesting while the first is being
// rate-limited -- and so a failure in either stops the run before the commit step,
// leaving a profile with two old cards rather than one new one beside one stale one.
if (config.stats.enabled) {
  console.log("\n── stats card ──");
  await import("./generate-card.mjs");
} else {
  console.log("Stats card: off");
}

if (config.languages.enabled) {
  console.log("\n── languages card ──");
  await import("./generate-languages.mjs");
} else {
  console.log("Languages card: off");
}
