let TOKEN;
let USERNAME;

// One HTTP client for every entry point: the same backoff, the same request log, the
// same reading of what the token can reach.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Every request is recorded and printed at the end, so a run states what it talked
// to rather than being taken on trust. URLs carry no secret: the token travels in
// the authorization header, never in a query string.
const httpLog = [];

// The search API enforces a secondary rate limit that a card with several search
// rows can trip, and a nightly run should not fail over something that clears in a
// minute. Retriable statuses back off; everything else fails immediately.
const RETRIABLE = new Set([403, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;

export function configure({ token, username }) {
  TOKEN = token;
  USERNAME = username;
}

export async function callGitHub(url, init) {
  httpLog.push(url.replace("https://api.github.com/", ""));
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(url, {
      ...init,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${TOKEN}`,
        "user-agent": `stats-card/${USERNAME}`,
        ...init?.headers,
      },
    });
    if (response.ok) {
      return response.json();
    }

    const body = await response.text();
    const retriable = RETRIABLE.has(response.status) && attempt < MAX_ATTEMPTS;
    if (!retriable) {
      throw new Error(`${url} -> HTTP ${response.status} ${body}`);
    }

    // Honour whatever the API asks for, falling back to exponential backoff.
    const retryAfter = Number(response.headers.get("retry-after"));
    const reset = Number(response.headers.get("x-ratelimit-reset"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Number.isFinite(reset) && reset > 0
        ? Math.max(0, reset * 1000 - Date.now())
        : 0;
    const delay = Math.min(60_000, waitMs || 2000 * 2 ** (attempt - 1));
    console.log(
      `HTTP ${response.status} on attempt ${attempt}/${MAX_ATTEMPTS}, retrying in ${Math.round(delay / 1000)}s`,
    );
    await sleep(delay);
  }
}

// What the token can actually reach decides several of these numbers, and a token
// that is too narrow under-reports silently rather than failing. Scopes are not
// secret, so read them and hold every metric to what it needs.
export async function readTokenScopes() {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${TOKEN}`,
      "user-agent": `stats-card/${USERNAME}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Token rejected: HTTP ${response.status}`);
  }
  const header = response.headers.get("x-oauth-scopes");
  // Fine-grained tokens carry no OAuth scopes at all, so the header is absent and
  // there is nothing to check against. Say so rather than implying a clean bill.
  if (header === null) {
    return { kind: "fine-grained", scopes: null };
  }
  return {
    kind: "classic",
    scopes: new Set(header.split(",").map((s) => s.trim()).filter(Boolean)),
  };
}

export async function graphql(query, variables = {}) {
  const payload = await callGitHub("https://api.github.com/graphql", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  });
  if (payload.errors?.length) {
    throw new Error(`GraphQL: ${payload.errors.map((e) => e.message).join("; ")}`);
  }
  return payload.data;
}

export { httpLog };
