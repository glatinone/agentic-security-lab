import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateScenario } from "../src/engine.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policy = JSON.parse(await readFile(path.join(root, "policies/portfolio-agent-v1.json"), "utf8"));

async function scenario(name) {
  return JSON.parse(await readFile(path.join(root, "scenarios", name), "utf8"));
}

test("scoped repository read is allowed", async () => {
  const report = evaluateScenario(await scenario("01-scoped-read.json"), policy);
  assert.equal(report.result, "pass");
  assert.equal(report.actions[0].decision, "allow");
  assert.equal(report.actions[0].matchedPolicyRule, "allow-repository-read");
});

test("undeclared capability is denied", async () => {
  const report = evaluateScenario(await scenario("02-undeclared-write.json"), policy);
  assert.equal(report.actions[0].decision, "deny");
  assert.ok(report.actions[0].findings.some(({ ruleId }) => ruleId === "ASL-101"));
});

test("untrusted influence blocks a sensitive action", async () => {
  const report = evaluateScenario(await scenario("03-prompt-injection.json"), policy);
  assert.ok(report.actions[0].findings.some(({ ruleId }) => ruleId === "ASL-109"));
});

test("valid scoped approval allows a repository update", async () => {
  const report = evaluateScenario(await scenario("04-approved-write.json"), policy);
  assert.equal(report.actions[0].decision, "allow");
  assert.deepEqual(report.actions[0].findings, []);
});

test("secret-like material is denied and absent from the report", async () => {
  const report = evaluateScenario(await scenario("05-secret-forwarding.json"), policy);
  assert.ok(report.actions[0].findings.some(({ ruleId }) => ruleId === "ASL-108"));
  assert.equal(JSON.stringify(report).includes("EXAMPLE0000"), false);
});

test("cross-tenant action is denied", async () => {
  const report = evaluateScenario(await scenario("06-cross-tenant-read.json"), policy);
  assert.ok(report.actions[0].findings.some(({ ruleId }) => ruleId === "ASL-107"));
});

test("expired approval is denied", async () => {
  const report = evaluateScenario(await scenario("07-expired-approval.json"), policy);
  assert.ok(report.actions[0].findings.some(({ ruleId }) => ruleId === "ASL-105"));
});

test("explicit deny takes precedence over a broad allow", async () => {
  const broadPolicy = {
    ...policy,
    rules: [
      policy.rules[0],
      {
        id: "allow-all-network",
        effect: "allow",
        capabilities: ["network.send"],
        operations: ["send"],
        resources: ["network://**"],
      },
    ],
  };
  const input = {
    ...(await scenario("01-scoped-read.json")),
    id: "deny-precedence",
    actor: { id: "sender", declaredCapabilities: ["network.send"] },
    actions: [
      {
        id: "webhook",
        capability: "network.send",
        operation: "send",
        resource: "network://webhook/collect",
        expectedDecision: "deny",
      },
    ],
  };
  const report = evaluateScenario(input, broadPolicy);
  assert.equal(report.actions[0].matchedPolicyRule, "deny-outbound-webhooks");
  assert.ok(report.actions[0].findings.some(({ ruleId }) => ruleId === "ASL-103"));
});

test("expectation mismatch fails the scenario without changing the decision", async () => {
  const input = await scenario("01-scoped-read.json");
  input.actions[0].expectedDecision = "deny";
  const report = evaluateScenario(input, policy);
  assert.equal(report.actions[0].decision, "allow");
  assert.equal(report.result, "fail");
  assert.equal(report.summary.expectationMismatches, 1);
});
