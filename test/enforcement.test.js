import test from "node:test";
import assert from "node:assert/strict";
import { enforceAndDispatch, ToolExecutionError } from "../src/enforcement.js";

const policy = {
  schemaVersion: "1.0",
  id: "support-boundary-v1",
  description: "Support agents may read tickets but may not send or mutate records.",
  defaultDecision: "deny",
  rules: [
    { id: "allow-ticket-read", effect: "allow", capabilities: ["ticket.read"], operations: ["read"], resources: ["ticket://acme/**"] },
    { id: "deny-customer-send", effect: "deny", capabilities: ["message.send"], operations: ["send"], resources: ["message://customer/**"] },
  ],
};

function request(action) {
  return {
    attemptId: `attempt-${action.id}`,
    evaluatedAt: "2026-09-21T02:00:00.000Z",
    actor: { id: "support-copilot", tenant: "acme", declaredCapabilities: ["ticket.read", "message.send"] },
    evidence: [{ id: "ticket-body", trust: "untrusted", source: "customer", summary: "Customer supplied ticket text." }],
    action,
  };
}

test("a denied action never invokes its registered tool", async () => {
  let calls = 0;
  const outcome = await enforceAndDispatch({
    policy,
    request: request({ id: "send-secret", capability: "message.send", operation: "send", resource: "message://customer/42", arguments: { body: "token=secret" }, influencedBy: ["ticket-body"] }),
    tools: { "message.send": async () => { calls += 1; } },
  });
  assert.equal(calls, 0);
  assert.equal(outcome.executed, false);
  assert.equal(outcome.receipt.outcome, "blocked");
  assert.equal(outcome.receipt.decision, "deny");
  assert.deepEqual(outcome.receipt.findingCodes, ["ASL-103"]);
  assert.equal(JSON.stringify(outcome.receipt).includes("token=secret"), false);
});

test("an allowed action invokes exactly one registered tool", async () => {
  const calls = [];
  const outcome = await enforceAndDispatch({
    policy,
    request: request({ id: "read-ticket", capability: "ticket.read", operation: "read", resource: "ticket://acme/42", arguments: { fields: ["subject", "body"] } }),
    tools: { "ticket.read": async (args, context) => { calls.push({ args, context }); return { subject: "Login issue" }; } },
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, { fields: ["subject", "body"] });
  assert.equal(calls[0].context.resource, "ticket://acme/42");
  assert.equal(outcome.executed, true);
  assert.equal(outcome.result.subject, "Login issue");
  assert.equal(outcome.receipt.outcome, "completed");
});

test("an allowed action without an adapter fails closed", async () => {
  await assert.rejects(
    enforceAndDispatch({
      policy,
      request: request({ id: "read-ticket", capability: "ticket.read", operation: "read", resource: "ticket://acme/42", arguments: {} }),
      tools: {},
    }),
    /no registered tool/,
  );
});

test("tool failure carries a redacted execution receipt", async () => {
  await assert.rejects(
    enforceAndDispatch({
      policy,
      request: request({ id: "read-ticket", capability: "ticket.read", operation: "read", resource: "ticket://acme/42", arguments: {} }),
      tools: { "ticket.read": async () => { throw new Error("vendor leaked a credential"); } },
    }),
    (error) => error instanceof ToolExecutionError && error.receipt.outcome === "tool_error" && !JSON.stringify(error.receipt).includes("credential"),
  );
});

test("production requests reject scenario-only expectation fields", async () => {
  const invalid = request({ id: "read-ticket", capability: "ticket.read", operation: "read", resource: "ticket://acme/42", arguments: {}, expectedDecision: "allow" });
  await assert.rejects(enforceAndDispatch({ policy, request: invalid, tools: {} }), /validation failed/);
});
