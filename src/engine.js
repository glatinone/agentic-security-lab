import { anyMatch, findSecretKinds, getTenantFromResource } from "./matchers.js";
import { finding } from "./rule-catalog.js";
import { validatePolicy, validateScenario } from "./validation.js";

const SENSITIVE_OPERATIONS = new Set(["create", "update", "delete", "execute", "send"]);

function ruleMatches(rule, action) {
  return (
    anyMatch(rule.capabilities, action.capability) &&
    anyMatch(rule.operations, action.operation) &&
    anyMatch(rule.resources, action.resource)
  );
}

function approvalFindings(action, evaluatedAt) {
  const approval = action.approval;
  if (!approval || approval.status !== "approved") {
    return [finding("ASL-104", `Action ${action.id} has no approved approval record.`)];
  }

  const results = [];
  const expiresAt = Date.parse(approval.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.parse(evaluatedAt)) {
    results.push(
      finding("ASL-105", `Approval ${approval.id ?? "(unnamed)"} is expired or has an invalid expiry time.`, {
        expiresAt: approval.expiresAt ?? null,
        evaluatedAt,
      }),
    );
  }

  const scope = approval.scope ?? {};
  const scopeMatches =
    anyMatch(scope.capabilities, action.capability) &&
    anyMatch(scope.operations, action.operation) &&
    anyMatch(scope.resources, action.resource);
  if (!scopeMatches) {
    results.push(
      finding("ASL-106", `Approval ${approval.id ?? "(unnamed)"} does not cover ${action.capability} on ${action.resource}.`, {
        approvalScope: scope,
      }),
    );
  }
  return results;
}

function untrustedInfluence(action, evidenceById) {
  return (action.influencedBy ?? [])
    .map((id) => evidenceById.get(id))
    .filter((item) => item?.trust === "untrusted");
}

export function evaluateAction({ action, actor, policy, evidenceById, evaluatedAt }) {
  const findings = [];
  const declared = actor.declaredCapabilities.some((capability) => anyMatch([capability], action.capability));
  if (!declared) {
    findings.push(
      finding("ASL-101", `${action.capability} is not present in ${actor.id}'s declared capabilities.`, {
        declaredCapabilities: actor.declaredCapabilities,
      }),
    );
  }

  const actorTenant = actor.tenant ?? null;
  const resourceTenant = action.tenant ?? getTenantFromResource(action.resource);
  if (actorTenant && resourceTenant && actorTenant !== resourceTenant) {
    findings.push(
      finding("ASL-107", `Actor tenant ${actorTenant} cannot access resource tenant ${resourceTenant}.`, {
        actorTenant,
        resourceTenant,
      }),
    );
  }

  const secretKinds = findSecretKinds(action.arguments);
  if (secretKinds.length) {
    findings.push(
      finding("ASL-108", `Secret-like material detected: ${secretKinds.join(", ")}.`, {
        detectedKinds: secretKinds,
      }),
    );
  }

  const matchingRules = policy.rules.filter((rule) => ruleMatches(rule, action));
  const denyRule = matchingRules.find((rule) => rule.effect === "deny");
  const allowRule = matchingRules.find((rule) => rule.effect === "allow");
  let matchedRule = denyRule ?? allowRule ?? null;

  if (denyRule) {
    findings.push(
      finding("ASL-103", `Policy rule ${denyRule.id} explicitly denies this action.`, {
        policyRuleId: denyRule.id,
      }),
    );
  } else if (!allowRule && policy.defaultDecision === "deny") {
    findings.push(
      finding("ASL-102", `No allow rule covers ${action.capability} ${action.operation} ${action.resource}.`),
    );
  }

  if (allowRule?.blockUntrustedInfluence && SENSITIVE_OPERATIONS.has(action.operation)) {
    const sources = untrustedInfluence(action, evidenceById);
    if (sources.length) {
      findings.push(
        finding("ASL-109", `Sensitive action was influenced by untrusted evidence: ${sources.map(({ id }) => id).join(", ")}.`, {
          evidenceIds: sources.map(({ id }) => id),
        }),
      );
    }
  }

  if (allowRule?.requireApproval) {
    findings.push(...approvalFindings(action, evaluatedAt));
  }

  const blocked = findings.length > 0;
  const decision = blocked ? "deny" : allowRule || policy.defaultDecision === "allow" ? "allow" : "deny";
  const matchedExpectation = decision === action.expectedDecision;

  return {
    actionId: action.id,
    capability: action.capability,
    operation: action.operation,
    resource: action.resource,
    decision,
    expectedDecision: action.expectedDecision,
    matchedExpectation,
    matchedPolicyRule: matchedRule?.id ?? null,
    findings,
  };
}

export function evaluateScenario(rawScenario, rawPolicy) {
  const scenario = validateScenario(rawScenario);
  const policy = validatePolicy(rawPolicy);
  const evaluatedAt = scenario.evaluatedAt ?? "2026-01-01T00:00:00.000Z";
  if (!Number.isFinite(Date.parse(evaluatedAt))) {
    throw new TypeError("evaluatedAt must be a valid ISO date when present");
  }

  const evidenceById = new Map((scenario.evidence ?? []).map((item) => [item.id, item]));
  const actions = scenario.actions.map((action) =>
    evaluateAction({ action, actor: scenario.actor, policy, evidenceById, evaluatedAt }),
  );
  const allowed = actions.filter(({ decision }) => decision === "allow").length;
  const denied = actions.length - allowed;
  const expectationMismatches = actions.filter(({ matchedExpectation }) => !matchedExpectation).length;

  return {
    reportVersion: "1.0",
    engineVersion: "0.2.0",
    scenario: {
      id: scenario.id,
      title: scenario.title,
      purpose: scenario.purpose ?? null,
    },
    policyId: policy.id,
    evaluatedAt,
    result: expectationMismatches === 0 ? "pass" : "fail",
    summary: {
      actions: actions.length,
      allowed,
      denied,
      findings: actions.reduce((count, action) => count + action.findings.length, 0),
      expectationMismatches,
    },
    actions,
  };
}
