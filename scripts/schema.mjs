// Writes docs/card.config.schema.json, the schema card.config.json points at.
//
// JSON cannot carry comments, and every option used to have one beside it in the
// workflow. An editor that reads the schema gives that back and more: the twenty-seven
// metric keys as completions, each with what it measures and whether it needs the read
// token, plus the allowed values for everything else. Generated rather than written, so
// the metric list cannot drift from the catalogue.
//
//   node scripts/schema.mjs

import { writeFile } from "node:fs/promises";

import { LAYOUTS } from "./layouts.mjs";
import { METRICS, effectiveRequirements } from "./metrics.mjs";

const OUT = new URL("../docs/card.config.schema.json", import.meta.url);

const needs = (metric) => {
  const scopes = effectiveRequirements(metric);
  return scopes.length ? `needs the read token (${scopes.join(", ")})` : "works without a token";
};

const metricKeys = METRICS.map((metric) => metric.key);
const metricDescriptions = METRICS.map((metric) => `${metric.label} — ${needs(metric)}`);

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "My GitHub Profile Stats configuration",
  description:
    "What the cards show. Every key is optional: anything left out keeps its default, " +
    "so a file may name one option or none.",
  type: "object",
  additionalProperties: false,
  properties: {
    $schema: { type: "string", description: "Path to this schema. Leave it alone." },
    theme: {
      description:
        "auto follows the reader's own light or dark setting; the other two are fixed.",
      enum: ["dark", "light", "auto"],
      default: "dark",
    },
    accent: {
      description:
        "Hex color for the icons and the contributions chart. null uses the theme's own. " +
        "A color too close to the surface is lightened until it is readable, and the run says so.",
      type: ["string", "null"],
      pattern: "^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
      default: null,
    },
    stats: {
      description: "The stats card: the rows, the chart, and how they are drawn.",
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: {
          description: "false skips the card entirely, and makes none of its requests.",
          type: "boolean",
          default: true,
        },
        output: {
          description:
            "Where to write the SVG, relative to your profile repository. The path this " +
            "readme embeds.",
          type: "string",
          default: "profile/stats.svg",
        },
        layout: {
          description: "tiles is a grid; mono is one column of larger figures.",
          enum: Object.keys(LAYOUTS),
          default: "tiles",
        },
        icons: {
          description: "An Octicon beside each row. null leaves it to the layout.",
          type: ["boolean", "null"],
          default: null,
        },
        sparkline: {
          description:
            "The contributions chart under the rows. Reads the contribution calendar, so " +
            "without the read token it is left out rather than drawn from public days alone.",
          type: "boolean",
          default: true,
        },
        metrics: {
          description:
            "The rows, in the order they appear. The list both picks them and orders them: " +
            "a row is on the card because it is named here. null uses the default five.",
          type: ["array", "null"],
          uniqueItems: true,
          items: {
            type: "string",
            enum: metricKeys,
            enumDescriptions: metricDescriptions,
          },
          default: null,
        },
      },
    },
    languages: {
      description: "The languages card, measured from the files you changed.",
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: {
          description: "false skips the card entirely, and makes none of its requests.",
          type: "boolean",
          default: true,
        },
        output: {
          description: "Where to write the SVG, relative to your profile repository.",
          type: "string",
          default: "profile/languages.svg",
        },
        pullRequestsToRead: {
          description:
            'How many of your most recent pull requests to read. "all" is the default ' +
            "because a sample does not converge: on one account Terraform read 30% over the " +
            "most recent 250 and 54% over all 716, a different ranking rather than a rougher one.",
          anyOf: [{ const: "all" }, { type: "integer", minimum: 1 }],
          default: "all",
        },
        exclude: {
          description:
            'Languages to leave out, by name, e.g. ["JSON", "YAML"]. The rest are shared ' +
            "out again over what is left.",
          type: "array",
          items: { type: "string" },
          default: [],
        },
        manual: {
          description:
            'Declare the languages instead of measuring them: {"Terraform": 54, "TypeScript": 21}. ' +
            "Weights, so percentages or line counts both work. Set, the card makes no request at " +
            "all. An empty object measures.",
          type: "object",
          additionalProperties: { type: "number", exclusiveMinimum: 0 },
          default: {},
        },
        top: {
          description:
            "How many languages to name before the rest are folded into Other. Anything " +
            "under one percent is folded in regardless, because a sliver reads as an artefact.",
          type: "integer",
          minimum: 1,
          maximum: 12,
          default: 6,
        },
      },
    },
  },
};

await writeFile(OUT, `${JSON.stringify(schema, null, 2)}\n`, "utf8");
console.log(`Wrote docs/card.config.schema.json — ${metricKeys.length} metrics`);
