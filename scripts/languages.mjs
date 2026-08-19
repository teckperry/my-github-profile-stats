// Languages measured from the files you changed, not from the repositories you are
// associated with. Repository language stats are Linguist's answer to "what is in
// this repo" and carry no notion of authorship, so aggregating them attributes a
// whole repo's composition to anyone who touched it. Measured on this account, that
// reported HTML 73% (a static blog) and later Jupyter Notebook 49% (a data repo
// touched once), against Terraform 54% for the files actually edited.

// Extension to language. Colors are GitHub's own, taken from the API where a repo
// here uses the language and from Linguist's published values otherwise.
const LANGUAGES = {
  Terraform: { color: "#844FBA", ext: [".tf", ".tfvars", ".tfbackend", ".hcl"] },
  TypeScript: { color: "#3178c6", ext: [".ts", ".tsx", ".mts", ".cts"] },
  JavaScript: { color: "#f1e05a", ext: [".js", ".jsx", ".mjs", ".cjs"] },
  Python: { color: "#3572A5", ext: [".py", ".pyi"] },
  Go: { color: "#00ADD8", ext: [".go"] },
  Rust: { color: "#dea584", ext: [".rs"] },
  Java: { color: "#b07219", ext: [".java"] },
  Kotlin: { color: "#A97BFF", ext: [".kt", ".kts"] },
  Swift: { color: "#F05138", ext: [".swift"] },
  Ruby: { color: "#701516", ext: [".rb"] },
  PHP: { color: "#4F5D95", ext: [".php"] },
  "C#": { color: "#178600", ext: [".cs"] },
  C: { color: "#555555", ext: [".c", ".h"] },
  "C++": { color: "#f34b7d", ext: [".cpp", ".cc", ".hpp"] },
  Shell: { color: "#89e051", ext: [".sh", ".bash", ".zsh"] },
  SQL: { color: "#e38c00", ext: [".sql"] },
  PLpgSQL: { color: "#336790", ext: [".pgsql"] },
  HTML: { color: "#e34c26", ext: [".html", ".htm", ".ejs"] },
  CSS: { color: "#663399", ext: [".css", ".scss", ".sass", ".less"] },
  Vue: { color: "#41b883", ext: [".vue"] },
  Svelte: { color: "#ff3e00", ext: [".svelte"] },
  Dockerfile: { color: "#384d54", ext: [".dockerfile"] },
  YAML: { color: "#cb171e", ext: [".yml", ".yaml"] },
  JSON: { color: "#292929", ext: [".json", ".jsonc"] },
  TOML: { color: "#9c4221", ext: [".toml"] },
  Markdown: { color: "#083fa1", ext: [".md", ".mdx", ".markdown"] },
  "Jupyter Notebook": { color: "#DA5B0B", ext: [".ipynb"] },
  Lua: { color: "#000080", ext: [".lua"] },
  Elixir: { color: "#6e4a7e", ext: [".ex", ".exs"] },
};

const OTHER = { name: "Other", color: "#8b949e" };

const BY_EXT = new Map();
for (const [name, { ext }] of Object.entries(LANGUAGES)) {
  for (const e of ext) {
    BY_EXT.set(e, name);
  }
}
// Files with no extension that still name a language.
const BY_FILENAME = new Map([["dockerfile", "Dockerfile"], ["makefile", "Makefile"]]);

const colorOf = (name) => LANGUAGES[name]?.color ?? OTHER.color;

const identify = (path) => {
  const file = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  const dot = file.lastIndexOf(".");
  if (dot > 0) {
    return BY_EXT.get(file.slice(dot)) ?? null;
  }
  return BY_FILENAME.get(file) ?? null;
};

const PR_PAGE = `
  query ($login: String!, $after: String) {
    user(login: $login) {
      pullRequests(first: 100, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes { files(first: 100) { totalCount nodes { path additions deletions } } }
      }
    }
  }
`;

// `limit` is a number of pull requests, not of pages: the page size is ours to know
// and nobody else's. Reading all of them is the default because samples mislead --
// this account reads Terraform at 30% over its 250 most recent PRs and 54% over all
// 716, which is a different ranking rather than a rougher one.
export async function measureLanguages(graphql, login, limit) {
  const wanted = limit === "all" ? Infinity : limit;
  const lines = new Map();
  let read = 0;
  let total = 0;
  let truncated = 0;
  let unmapped = 0;
  let after = null;

  while (read < wanted) {
    const data = await graphql(PR_PAGE, { login, after });
    const prs = data.user.pullRequests;
    total = prs.totalCount;
    for (const pr of prs.nodes) {
      if (read >= wanted) {
        break;
      }
      read += 1;
      const files = pr.files;
      if (files?.totalCount > 100) {
        truncated += 1;
      }
      for (const file of files?.nodes ?? []) {
        const weight = file.additions + file.deletions;
        const name = identify(file.path);
        if (name) {
          lines.set(name, (lines.get(name) ?? 0) + weight);
        } else {
          unmapped += weight;
        }
      }
    }
    if (!prs.pageInfo.hasNextPage) {
      break;
    }
    after = prs.pageInfo.endCursor;
  }

  return { lines, read, total, truncated, unmapped };
}

// "Terraform 54, TypeScript 21" -- treated as weights, so percentages and raw line
// counts both work, and no request is made at all.
export function parseManual(spec) {
  const entries = spec
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = /^(.*?)[\s:=]+([\d.]+)%?$/.exec(part);
      if (!match) {
        throw new Error(`MANUAL_LANGUAGES: cannot read "${part}". Use "Name 54, Name 21".`);
      }
      return [match[1].trim(), Number(match[2])];
    });
  if (entries.length === 0) {
    throw new Error("MANUAL_LANGUAGES is set but lists nothing.");
  }
  return new Map(entries);
}

// Shares out of what survives exclusion, with the tail folded into Other rather than
// dropped, so the percentages always account for everything measured.
export function shareOut(lines, { exclude = [], top = 6, minShare = 1 } = {}) {
  const dropped = new Set(exclude.map((name) => name.toLowerCase()));
  const kept = [...lines].filter(([name]) => !dropped.has(name.toLowerCase()));
  const total = kept.reduce((sum, [, value]) => sum + value, 0);
  if (total === 0) {
    return [];
  }
  const sorted = kept.sort((a, b) => b[1] - a[1]);
  // A share under a percent draws as a one-pixel sliver, which reads as an artefact
  // rather than a measurement, so the tail is folded into Other by width as well as
  // by rank.
  const significant = sorted.filter(([, value]) => (value / total) * 100 >= minShare);
  const head = significant.slice(0, top);
  const kept_names = new Set(head.map(([name]) => name));
  const tail = sorted
    .filter(([name]) => !kept_names.has(name))
    .reduce((sum, [, value]) => sum + value, 0);
  const segments = head.map(([name, value]) => ({
    name,
    color: colorOf(name),
    share: (value / total) * 100,
  }));
  if (tail > 0) {
    segments.push({ ...OTHER, share: (tail / total) * 100 });
  }
  return segments;
}
