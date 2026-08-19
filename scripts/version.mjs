// The version of this copy, read from the VERSION file rather than repeated in code.
//
// It exists so a copy can tell whether it is behind. A release tags a version and
// writes it here, which gives an update check something to compare against: one file,
// one line, and no need to diff a tree against a tag to answer "am I current?".

import { readFileSync } from "node:fs";

export const VERSION = readFileSync(new URL("../VERSION", import.meta.url), "utf8").trim();
