const REGEX_SPECIAL = /[.+^${}()|[\]\\]/g;

export function globMatches(pattern, value) {
  if (typeof pattern !== "string" || typeof value !== "string") return false;
  if (pattern === "*") return true;

  const doubleStarSentinel = "\u0000DOUBLE_STAR\u0000";
  const escaped = pattern
    .replaceAll("**", doubleStarSentinel)
    .replace(REGEX_SPECIAL, "\\$&")
    .replaceAll("*", "[^/]*")
    .replaceAll(doubleStarSentinel, ".*");
  return new RegExp(`^${escaped}$`).test(value);
}

export function anyMatch(patterns, value) {
  return Array.isArray(patterns) && patterns.some((pattern) => globMatches(pattern, value));
}

export function inspectResource(value, { allowWildcards = false } = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, reason: "resource must be a non-empty string", canonical: null };
  }
  if (!allowWildcards && value.includes("*")) {
    return { ok: false, reason: "action resources cannot contain wildcards", canonical: null };
  }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return { ok: false, reason: "resource must start with a URI scheme", canonical: null };
  }
  if (/[?#]/.test(value)) {
    return { ok: false, reason: "query strings and fragments are not valid resource identifiers", canonical: null };
  }

  let decoded = value;
  try {
    for (let depth = 0; depth < 5; depth += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
      if (depth === 4 && decodeURIComponent(decoded) !== decoded) {
        return { ok: false, reason: "resource encoding exceeds the normalization limit", canonical: null };
      }
    }
  } catch {
    return { ok: false, reason: "resource contains malformed percent encoding", canonical: null };
  }

  const canonical = decoded.normalize("NFC");
  if (!allowWildcards && canonical.includes("*")) {
    return { ok: false, reason: "decoded action resource contains a wildcard", canonical: null };
  }
  if (/[?#]/.test(canonical)) {
    return { ok: false, reason: "decoded resource contains a query string or fragment", canonical: null };
  }
  if (/[\\\s\u0000-\u001f\u007f]/.test(canonical)) {
    return { ok: false, reason: "resource contains a forbidden separator or control character", canonical: null };
  }
  const segments = canonical.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return { ok: false, reason: "resource contains a traversal segment", canonical: null };
  }

  const colon = canonical.indexOf(":");
  const remainder = canonical.slice(colon + 1);
  let pathPart = remainder;
  if (remainder.startsWith("//")) {
    const authorityAndPath = remainder.slice(2).split("/");
    if (!authorityAndPath[0]) {
      return { ok: false, reason: "resource authority cannot be empty", canonical: null };
    }
    pathPart = authorityAndPath.slice(1).join("/");
  } else if (!remainder) {
    return { ok: false, reason: "resource identifier cannot be empty", canonical: null };
  }
  if (pathPart.startsWith("/") || pathPart.includes("//")) {
    return { ok: false, reason: "resource contains an empty path segment", canonical: null };
  }

  return { ok: true, reason: null, canonical };
}

const SECRET_PATTERNS = [
  { kind: "private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { kind: "GitHub token", regex: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/ },
  { kind: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { kind: "bearer token", regex: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/i },
  { kind: "secret assignment", regex: /\b(?:api[_-]?key|client[_-]?secret|password|token)\s*[:=]\s*["']?[^\s"']{12,}/i },
];

export function findSecretKinds(value) {
  const serialized = JSON.stringify(value ?? {});
  return SECRET_PATTERNS.filter(({ regex }) => regex.test(serialized)).map(({ kind }) => kind);
}

export function getTenantFromResource(resource) {
  const match = /^tenant:([^/]+)\//.exec(resource);
  return match?.[1] ?? null;
}
