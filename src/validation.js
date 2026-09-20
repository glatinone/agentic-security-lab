import { InputError } from "./errors.js";

const OPERATIONS = new Set([
  "read",
  "list",
  "search",
  "create",
  "update",
  "delete",
  "execute",
  "send",
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, path, issues) {
  if (typeof value !== "string" || value.trim() === "") {
    issues.push(`${path} must be a non-empty string`);
  }
}

function requireStringArray(value, path, issues) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    issues.push(`${path} must be an array of non-empty strings`);
  }
}

export function validatePolicy(policy) {
  const issues = [];
  if (!isRecord(policy)) {
    throw new InputError("Policy is not a JSON object", ["root must be an object"]);
  }

  if (policy.schemaVersion !== "1.0") issues.push('schemaVersion must equal "1.0"');
  requireString(policy.id, "id", issues);
  if (!['allow', 'deny'].includes(policy.defaultDecision)) {
    issues.push('defaultDecision must be "allow" or "deny"');
  }
  if (!Array.isArray(policy.rules) || policy.rules.length === 0) {
    issues.push("rules must contain at least one rule");
  } else {
    const ids = new Set();
    policy.rules.forEach((rule, index) => {
      const path = `rules[${index}]`;
      if (!isRecord(rule)) {
        issues.push(`${path} must be an object`);
        return;
      }
      requireString(rule.id, `${path}.id`, issues);
      if (ids.has(rule.id)) issues.push(`${path}.id must be unique`);
      ids.add(rule.id);
      if (!['allow', 'deny'].includes(rule.effect)) issues.push(`${path}.effect must be allow or deny`);
      requireStringArray(rule.capabilities, `${path}.capabilities`, issues);
      requireStringArray(rule.operations, `${path}.operations`, issues);
      requireStringArray(rule.resources, `${path}.resources`, issues);
      if (rule.operations?.some((operation) => !OPERATIONS.has(operation) && operation !== "*")) {
        issues.push(`${path}.operations contains an unsupported operation`);
      }
      if (rule.requireApproval !== undefined && typeof rule.requireApproval !== "boolean") {
        issues.push(`${path}.requireApproval must be boolean when present`);
      }
      if (rule.blockUntrustedInfluence !== undefined && typeof rule.blockUntrustedInfluence !== "boolean") {
        issues.push(`${path}.blockUntrustedInfluence must be boolean when present`);
      }
    });
  }

  if (issues.length) throw new InputError("Policy validation failed", issues);
  return policy;
}

export function validateScenario(scenario) {
  const issues = [];
  if (!isRecord(scenario)) {
    throw new InputError("Scenario is not a JSON object", ["root must be an object"]);
  }

  if (scenario.schemaVersion !== "1.0") issues.push('schemaVersion must equal "1.0"');
  requireString(scenario.id, "id", issues);
  requireString(scenario.title, "title", issues);
  requireString(scenario.policy, "policy", issues);
  if (scenario.evaluatedAt !== undefined && !Number.isFinite(Date.parse(scenario.evaluatedAt))) {
    issues.push("evaluatedAt must be a valid date-time when present");
  }

  if (!isRecord(scenario.actor)) {
    issues.push("actor must be an object");
  } else {
    requireString(scenario.actor.id, "actor.id", issues);
    requireStringArray(scenario.actor.declaredCapabilities, "actor.declaredCapabilities", issues);
    if (scenario.actor.tenant !== undefined) requireString(scenario.actor.tenant, "actor.tenant", issues);
  }

  if (!Array.isArray(scenario.actions) || scenario.actions.length === 0) {
    issues.push("actions must contain at least one action");
  } else {
    const ids = new Set();
    scenario.actions.forEach((action, index) => {
      const path = `actions[${index}]`;
      if (!isRecord(action)) {
        issues.push(`${path} must be an object`);
        return;
      }
      requireString(action.id, `${path}.id`, issues);
      if (ids.has(action.id)) issues.push(`${path}.id must be unique`);
      ids.add(action.id);
      requireString(action.capability, `${path}.capability`, issues);
      requireString(action.operation, `${path}.operation`, issues);
      requireString(action.resource, `${path}.resource`, issues);
      if (!OPERATIONS.has(action.operation)) issues.push(`${path}.operation is unsupported`);
      if (!['allow', 'deny'].includes(action.expectedDecision)) {
        issues.push(`${path}.expectedDecision must be allow or deny`);
      }
      if (action.influencedBy !== undefined) requireStringArray(action.influencedBy, `${path}.influencedBy`, issues);
    });
  }

  const evidenceIds = new Set();
  if (scenario.evidence !== undefined && !Array.isArray(scenario.evidence)) {
    issues.push("evidence must be an array when present");
  } else {
    (scenario.evidence ?? []).forEach((evidence, index) => {
      const path = `evidence[${index}]`;
      if (!isRecord(evidence)) {
        issues.push(`${path} must be an object`);
        return;
      }
      requireString(evidence.id, `${path}.id`, issues);
      if (evidenceIds.has(evidence.id)) issues.push(`${path}.id must be unique`);
      evidenceIds.add(evidence.id);
      if (!['trusted', 'untrusted'].includes(evidence.trust)) {
        issues.push(`${path}.trust must be trusted or untrusted`);
      }
    });
  }

  for (const [index, action] of (scenario.actions ?? []).entries()) {
    if (!isRecord(action)) continue;
    for (const evidenceId of action.influencedBy ?? []) {
      if (!evidenceIds.has(evidenceId)) {
        issues.push(`actions[${index}].influencedBy references unknown evidence ${evidenceId}`);
      }
    }
    if (action.approval !== undefined) {
      if (!isRecord(action.approval)) {
        issues.push(`actions[${index}].approval must be an object`);
      } else {
        requireString(action.approval.id, `actions[${index}].approval.id`, issues);
        if (!['approved', 'rejected'].includes(action.approval.status)) {
          issues.push(`actions[${index}].approval.status must be approved or rejected`);
        }
        requireString(action.approval.expiresAt, `actions[${index}].approval.expiresAt`, issues);
        const scope = action.approval.scope;
        if (!isRecord(scope)) {
          issues.push(`actions[${index}].approval.scope must be an object`);
        } else {
          requireStringArray(scope.capabilities, `actions[${index}].approval.scope.capabilities`, issues);
          requireStringArray(scope.operations, `actions[${index}].approval.scope.operations`, issues);
          requireStringArray(scope.resources, `actions[${index}].approval.scope.resources`, issues);
        }
      }
    }
  }

  if (issues.length) throw new InputError("Scenario validation failed", issues);
  return scenario;
}
