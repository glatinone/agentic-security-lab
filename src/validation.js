import { InputError } from "./errors.js";
import { inspectResource } from "./matchers.js";

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

function rejectUnknownKeys(value, allowed, path, issues) {
  if (!isRecord(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issues.push(`${path}.${key} is not a supported field`);
  }
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

  rejectUnknownKeys(
    policy,
    new Set(["schemaVersion", "id", "description", "defaultDecision", "rules"]),
    "policy",
    issues,
  );

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
      rejectUnknownKeys(
        rule,
        new Set([
          "id",
          "effect",
          "capabilities",
          "operations",
          "resources",
          "requireApproval",
          "blockUntrustedInfluence",
        ]),
        path,
        issues,
      );
      requireString(rule.id, `${path}.id`, issues);
      if (ids.has(rule.id)) issues.push(`${path}.id must be unique`);
      ids.add(rule.id);
      if (!['allow', 'deny'].includes(rule.effect)) issues.push(`${path}.effect must be allow or deny`);
      requireStringArray(rule.capabilities, `${path}.capabilities`, issues);
      requireStringArray(rule.operations, `${path}.operations`, issues);
      requireStringArray(rule.resources, `${path}.resources`, issues);
      for (const resource of rule.resources ?? []) {
        const inspected = inspectResource(resource, { allowWildcards: true });
        if (!inspected.ok || inspected.canonical !== resource) {
          issues.push(`${path}.resources contains a non-canonical pattern: ${inspected.reason ?? resource}`);
        }
      }
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

  rejectUnknownKeys(
    scenario,
    new Set(["schemaVersion", "id", "title", "purpose", "policy", "evaluatedAt", "actor", "evidence", "actions"]),
    "scenario",
    issues,
  );

  if (scenario.schemaVersion !== "1.0") issues.push('schemaVersion must equal "1.0"');
  requireString(scenario.id, "id", issues);
  requireString(scenario.title, "title", issues);
  requireString(scenario.policy, "policy", issues);
  if (!Number.isFinite(Date.parse(scenario.evaluatedAt))) {
    issues.push("evaluatedAt must be a valid date-time");
  }

  if (!isRecord(scenario.actor)) {
    issues.push("actor must be an object");
  } else {
    rejectUnknownKeys(scenario.actor, new Set(["id", "tenant", "declaredCapabilities"]), "actor", issues);
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
      rejectUnknownKeys(
        action,
        new Set([
          "id",
          "capability",
          "operation",
          "resource",
          "tenant",
          "arguments",
          "influencedBy",
          "approval",
          "expectedDecision",
        ]),
        path,
        issues,
      );
      requireString(action.id, `${path}.id`, issues);
      if (ids.has(action.id)) issues.push(`${path}.id must be unique`);
      ids.add(action.id);
      requireString(action.capability, `${path}.capability`, issues);
      requireString(action.operation, `${path}.operation`, issues);
      requireString(action.resource, `${path}.resource`, issues);
      if (action.tenant !== undefined) requireString(action.tenant, `${path}.tenant`, issues);
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
      rejectUnknownKeys(evidence, new Set(["id", "trust", "source", "summary"]), path, issues);
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
        rejectUnknownKeys(action.approval, new Set(["id", "status", "expiresAt", "scope"]), `actions[${index}].approval`, issues);
        requireString(action.approval.id, `actions[${index}].approval.id`, issues);
        if (!['approved', 'rejected'].includes(action.approval.status)) {
          issues.push(`actions[${index}].approval.status must be approved or rejected`);
        }
        requireString(action.approval.expiresAt, `actions[${index}].approval.expiresAt`, issues);
        const scope = action.approval.scope;
        if (!isRecord(scope)) {
          issues.push(`actions[${index}].approval.scope must be an object`);
        } else {
          rejectUnknownKeys(
            scope,
            new Set(["capabilities", "operations", "resources"]),
            `actions[${index}].approval.scope`,
            issues,
          );
          requireStringArray(scope.capabilities, `actions[${index}].approval.scope.capabilities`, issues);
          requireStringArray(scope.operations, `actions[${index}].approval.scope.operations`, issues);
          requireStringArray(scope.resources, `actions[${index}].approval.scope.resources`, issues);
          for (const resource of scope.resources ?? []) {
            const inspected = inspectResource(resource, { allowWildcards: true });
            if (!inspected.ok || inspected.canonical !== resource) {
              issues.push(`actions[${index}].approval.scope.resources contains a non-canonical pattern`);
            }
          }
        }
      }
    }
  }

  if (issues.length) throw new InputError("Scenario validation failed", issues);
  return scenario;
}

export function validateExecutionRequest(request) {
  const issues = [];
  if (!isRecord(request)) throw new InputError("Execution request is not a JSON object", ["root must be an object"]);
  rejectUnknownKeys(request, new Set(["attemptId", "evaluatedAt", "actor", "evidence", "action"]), "request", issues);
  requireString(request.attemptId, "attemptId", issues);
  if (!Number.isFinite(Date.parse(request.evaluatedAt))) issues.push("evaluatedAt must be a valid date-time");

  const actor = request.actor;
  if (!isRecord(actor)) {
    issues.push("actor must be an object");
  } else {
    rejectUnknownKeys(actor, new Set(["id", "tenant", "declaredCapabilities"]), "actor", issues);
    requireString(actor.id, "actor.id", issues);
    requireStringArray(actor.declaredCapabilities, "actor.declaredCapabilities", issues);
    if (actor.tenant !== undefined) requireString(actor.tenant, "actor.tenant", issues);
  }

  const evidenceIds = new Set();
  if (request.evidence !== undefined && !Array.isArray(request.evidence)) {
    issues.push("evidence must be an array when present");
  } else {
    (request.evidence ?? []).forEach((evidence, index) => {
      const path = `evidence[${index}]`;
      if (!isRecord(evidence)) return issues.push(`${path} must be an object`);
      rejectUnknownKeys(evidence, new Set(["id", "trust", "source", "summary"]), path, issues);
      requireString(evidence.id, `${path}.id`, issues);
      if (evidenceIds.has(evidence.id)) issues.push(`${path}.id must be unique`);
      evidenceIds.add(evidence.id);
      if (!["trusted", "untrusted"].includes(evidence.trust)) issues.push(`${path}.trust must be trusted or untrusted`);
    });
  }

  const action = request.action;
  if (!isRecord(action)) {
    issues.push("action must be an object");
  } else {
    rejectUnknownKeys(action, new Set(["id", "capability", "operation", "resource", "tenant", "arguments", "influencedBy", "approval"]), "action", issues);
    requireString(action.id, "action.id", issues);
    requireString(action.capability, "action.capability", issues);
    requireString(action.operation, "action.operation", issues);
    requireString(action.resource, "action.resource", issues);
    if (action.tenant !== undefined) requireString(action.tenant, "action.tenant", issues);
    if (!OPERATIONS.has(action.operation)) issues.push("action.operation is unsupported");
    if (action.arguments !== undefined && !isRecord(action.arguments)) issues.push("action.arguments must be an object when present");
    if (action.influencedBy !== undefined) requireStringArray(action.influencedBy, "action.influencedBy", issues);
    for (const evidenceId of action.influencedBy ?? []) {
      if (!evidenceIds.has(evidenceId)) issues.push(`action.influencedBy references unknown evidence ${evidenceId}`);
    }
    if (action.approval !== undefined) validateExecutionApproval(action.approval, issues);
  }

  if (issues.length) throw new InputError("Execution request validation failed", issues);
  return request;
}

function validateExecutionApproval(approval, issues) {
  if (!isRecord(approval)) return issues.push("action.approval must be an object");
  rejectUnknownKeys(approval, new Set(["id", "status", "expiresAt", "scope"]), "action.approval", issues);
  requireString(approval.id, "action.approval.id", issues);
  if (!["approved", "rejected"].includes(approval.status)) issues.push("action.approval.status must be approved or rejected");
  requireString(approval.expiresAt, "action.approval.expiresAt", issues);
  const scope = approval.scope;
  if (!isRecord(scope)) return issues.push("action.approval.scope must be an object");
  rejectUnknownKeys(scope, new Set(["capabilities", "operations", "resources"]), "action.approval.scope", issues);
  requireStringArray(scope.capabilities, "action.approval.scope.capabilities", issues);
  requireStringArray(scope.operations, "action.approval.scope.operations", issues);
  requireStringArray(scope.resources, "action.approval.scope.resources", issues);
  for (const resource of scope.resources ?? []) {
    const inspected = inspectResource(resource, { allowWildcards: true });
    if (!inspected.ok || inspected.canonical !== resource) issues.push(`action.approval.scope.resources contains a non-canonical pattern: ${inspected.reason ?? resource}`);
  }
}

export function validateTrace(trace) {
  const issues = [];
  if (!isRecord(trace)) throw new InputError("Trace is not a JSON object", ["root must be an object"]);
  rejectUnknownKeys(trace, new Set(["schemaVersion", "id", "title", "events", "expectedFindings"]), "trace", issues);
  if (trace.schemaVersion !== "1.0") issues.push('schemaVersion must equal "1.0"');
  requireString(trace.id, "id", issues);
  requireString(trace.title, "title", issues);
  if (!Array.isArray(trace.events) || trace.events.length === 0) {
    issues.push("events must contain at least one event");
  } else {
    const eventIds = new Set();
    trace.events.forEach((event, index) => {
      const path = `events[${index}]`;
      if (!isRecord(event)) {
        issues.push(`${path} must be an object`);
        return;
      }
      rejectUnknownKeys(event, new Set(["id", "type", "actionId", "decision", "outcome"]), path, issues);
      requireString(event.id, `${path}.id`, issues);
      if (eventIds.has(event.id)) issues.push(`${path}.id must be unique`);
      eventIds.add(event.id);
      requireString(event.actionId, `${path}.actionId`, issues);
      if (!["policy.decision", "tool.completed"].includes(event.type)) {
        issues.push(`${path}.type must be policy.decision or tool.completed`);
      }
      if (event.type === "policy.decision" && !["allow", "deny"].includes(event.decision)) {
        issues.push(`${path}.decision must be allow or deny`);
      }
    });
  }
  requireStringArray(trace.expectedFindings, "expectedFindings", issues);
  if (issues.length) throw new InputError("Trace validation failed", issues);
  return trace;
}
