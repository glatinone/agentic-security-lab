import { evaluateAction } from "./engine.js";
import { InputError } from "./errors.js";
import { validateExecutionRequest, validatePolicy } from "./validation.js";

export class ToolExecutionError extends Error {
  constructor(receipt, cause) {
    super(`Tool execution failed for ${receipt.actionId}`);
    this.name = "ToolExecutionError";
    this.receipt = receipt;
    this.cause = cause;
  }
}

export async function enforceAndDispatch({ request: rawRequest, policy: rawPolicy, tools }) {
  const request = validateExecutionRequest(rawRequest);
  const policy = validatePolicy(rawPolicy);
  if (!tools || typeof tools !== "object" || Array.isArray(tools)) {
    throw new InputError("Tool registry validation failed", ["tools must be an object keyed by capability"]);
  }

  const evidenceById = new Map((request.evidence ?? []).map((item) => [item.id, item]));
  const rawDecision = evaluateAction({
    action: request.action,
    actor: request.actor,
    policy,
    evidenceById,
    evaluatedAt: request.evaluatedAt,
  });
  const decision = executionDecision(rawDecision);

  if (decision.decision === "deny") {
    return {
      executed: false,
      result: undefined,
      decision,
      receipt: createReceipt(request, decision, "blocked"),
    };
  }

  const tool = tools[request.action.capability];
  if (typeof tool !== "function") {
    const receipt = createReceipt(request, decision, "tool_unavailable");
    throw new InputError("Allowed action has no registered tool", [
      `tools.${request.action.capability} must be a function`,
      `attempt ${receipt.attemptId} was not executed`,
    ]);
  }

  const dispatchContext = Object.freeze({
    attemptId: request.attemptId,
    evaluatedAt: request.evaluatedAt,
    actorId: request.actor.id,
    actionId: request.action.id,
    capability: request.action.capability,
    operation: request.action.operation,
    resource: decision.canonicalResource,
    matchedPolicyRules: decision.matchedPolicyRules,
  });

  try {
    const result = await tool(structuredClone(request.action.arguments ?? {}), dispatchContext);
    return {
      executed: true,
      result,
      decision,
      receipt: createReceipt(request, decision, "completed"),
    };
  } catch (error) {
    throw new ToolExecutionError(createReceipt(request, decision, "tool_error"), error);
  }
}

function executionDecision(rawDecision) {
  const { expectedDecision: _expected, matchedExpectation: _matched, ...decision } = rawDecision;
  return decision;
}

function createReceipt(request, decision, outcome) {
  return Object.freeze({
    schemaVersion: "1.0",
    attemptId: request.attemptId,
    evaluatedAt: request.evaluatedAt,
    actorId: request.actor.id,
    actionId: request.action.id,
    capability: request.action.capability,
    operation: request.action.operation,
    canonicalResource: decision.canonicalResource,
    decision: decision.decision,
    matchedPolicyRules: [...decision.matchedPolicyRules],
    findingCodes: decision.findings.map(({ ruleId }) => ruleId),
    executed: outcome === "completed" || outcome === "tool_error",
    outcome,
  });
}
