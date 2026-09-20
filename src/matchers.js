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
