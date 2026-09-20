export const RULE_CATALOG = Object.freeze({
  "ASL-101": {
    title: "Capability was not declared",
    severity: "critical",
    explanation: "An action cannot gain authority from model output or retrieved content.",
  },
  "ASL-102": {
    title: "No policy rule allowed the action",
    severity: "high",
    explanation: "The policy uses deny by default when an action has no allow rule.",
  },
  "ASL-103": {
    title: "Explicit deny rule matched",
    severity: "critical",
    explanation: "A matching deny rule takes precedence over allow rules.",
  },
  "ASL-104": {
    title: "Required approval is missing",
    severity: "high",
    explanation: "The matching policy rule requires a valid approval record.",
  },
  "ASL-105": {
    title: "Approval has expired",
    severity: "high",
    explanation: "An approval is valid only until its declared expiry time.",
  },
  "ASL-106": {
    title: "Approval scope does not cover the action",
    severity: "critical",
    explanation: "Capability, operation, and resource must all match the approval scope.",
  },
  "ASL-107": {
    title: "Resource crosses the actor tenant boundary",
    severity: "critical",
    explanation: "A tenant-scoped actor cannot act on a resource owned by another tenant.",
  },
  "ASL-108": {
    title: "Action arguments contain secret-like material",
    severity: "critical",
    explanation: "Secret-like values must be removed before actions or traces are evaluated.",
  },
  "ASL-109": {
    title: "Untrusted content influenced a sensitive action",
    severity: "high",
    explanation: "A policy can prevent retrieved content from causing mutation, execution, or sending.",
  },
});

export function finding(ruleId, detail, evidence = {}) {
  const rule = RULE_CATALOG[ruleId];
  return { ruleId, ...rule, detail, evidence };
}
