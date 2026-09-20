import test from "node:test";
import assert from "node:assert/strict";
import { renderJson, renderMarkdown, renderTerminal } from "../src/reporters.js";

const report = {
  reportVersion: "1.0",
  engineVersion: "0.2.0",
  scenario: { id: "example", title: "Example", purpose: null },
  policyId: "policy",
  evaluatedAt: "2026-09-20T10:00:00.000Z",
  result: "pass",
  summary: { actions: 1, allowed: 1, denied: 0, findings: 0, expectationMismatches: 0 },
  actions: [
    {
      actionId: "read",
      capability: "file.read",
      operation: "read",
      resource: "file://README.md",
      decision: "allow",
      expectedDecision: "allow",
      matchedExpectation: true,
      matchedPolicyRule: "read",
      findings: [],
    },
  ],
};

test("terminal report carries the decision evidence", () => {
  const output = renderTerminal(report);
  assert.match(output, /PASS  example/);
  assert.match(output, /\[ALLOW\] read/);
  assert.match(output, /policy rule: read/);
});

test("markdown report states the assurance limit", () => {
  const output = renderMarkdown(report);
  assert.match(output, /does not prove that a live agent/);
});

test("JSON report round trips", () => {
  assert.deepEqual(JSON.parse(renderJson(report)), report);
});
