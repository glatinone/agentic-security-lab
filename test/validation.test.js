import test from "node:test";
import assert from "node:assert/strict";
import { InputError } from "../src/errors.js";
import { validatePolicy, validateScenario } from "../src/validation.js";

const validPolicy = {
  schemaVersion: "1.0",
  id: "test-policy",
  defaultDecision: "deny",
  rules: [
    {
      id: "read",
      effect: "allow",
      capabilities: ["file.read"],
      operations: ["read"],
      resources: ["file://**"],
    },
  ],
};

const validScenario = {
  schemaVersion: "1.0",
  id: "test-scenario",
  title: "Test scenario",
  policy: "../policies/test.json",
  evaluatedAt: "2026-09-20T10:00:00.000Z",
  actor: { id: "agent", declaredCapabilities: ["file.read"] },
  actions: [
    {
      id: "read",
      capability: "file.read",
      operation: "read",
      resource: "file://README.md",
      expectedDecision: "allow",
    },
  ],
};

test("valid policy is returned unchanged", () => {
  assert.equal(validatePolicy(validPolicy), validPolicy);
});

test("duplicate policy rule ids are rejected", () => {
  const policy = { ...validPolicy, rules: [validPolicy.rules[0], { ...validPolicy.rules[0] }] };
  assert.throws(() => validatePolicy(policy), InputError);
});

test("unsupported operations are rejected", () => {
  const policy = {
    ...validPolicy,
    rules: [{ ...validPolicy.rules[0], operations: ["teleport"] }],
  };
  assert.throws(() => validatePolicy(policy), /Policy validation failed/);
});

test("non-canonical policy resource patterns are rejected", () => {
  const policy = {
    ...validPolicy,
    rules: [{ ...validPolicy.rules[0], resources: ["file://workspace/%2e%2e/secret"] }],
  };
  assert.throws(() => validatePolicy(policy), /Policy validation failed/);
});

test("duplicate action ids are rejected", () => {
  const scenario = { ...validScenario, actions: [validScenario.actions[0], { ...validScenario.actions[0] }] };
  assert.throws(() => validateScenario(scenario), /Scenario validation failed/);
});

test("unknown evidence references are rejected", () => {
  const scenario = {
    ...validScenario,
    actions: [{ ...validScenario.actions[0], influencedBy: ["missing"] }],
  };
  assert.throws(() => validateScenario(scenario), /Scenario validation failed/);
});

test("malformed approval scope is rejected before evaluation", () => {
  const scenario = {
    ...validScenario,
    actions: [{ ...validScenario.actions[0], approval: { id: "approval", status: "approved" } }],
  };
  assert.throws(() => validateScenario(scenario), /Scenario validation failed/);
});

test("invalid evaluation timestamps are rejected", () => {
  assert.throws(() => validateScenario({ ...validScenario, evaluatedAt: "next Tuesday" }), InputError);
});
