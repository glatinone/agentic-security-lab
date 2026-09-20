import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditTrace } from "../src/trace-audit.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function trace(name) {
  return JSON.parse(await readFile(path.join(root, "traces", name), "utf8"));
}

test("completion after allow has no finding", async () => {
  const report = auditTrace(await trace("01-allowed-completion.json"));
  assert.equal(report.result, "pass");
  assert.deepEqual(report.findings, []);
});

test("completion after deny produces ASL-201", async () => {
  const report = auditTrace(await trace("02-completion-after-deny.json"));
  assert.equal(report.findings[0].ruleId, "ASL-201");
  assert.equal(report.findings[0].evidence.decisionEventId, "decision-write");
});

test("completion without a decision produces ASL-202", async () => {
  const report = auditTrace(await trace("03-completion-without-decision.json"));
  assert.equal(report.findings[0].ruleId, "ASL-202");
});

test("a decision recorded after completion is too late", async () => {
  const report = auditTrace(await trace("04-late-decision.json"));
  assert.equal(report.findings[0].ruleId, "ASL-202");
});

test("changed expected findings fail an otherwise stable audit", async () => {
  const input = await trace("02-completion-after-deny.json");
  input.expectedFindings = [];
  const report = auditTrace(input);
  assert.equal(report.result, "fail");
  assert.equal(report.summary.matchedExpectation, false);
});

test("the latest decision controls a later completion", async () => {
  const input = await trace("01-allowed-completion.json");
  input.events = [
    { id: "first", type: "policy.decision", actionId: "action", decision: "deny" },
    { id: "second", type: "policy.decision", actionId: "action", decision: "allow" },
    { id: "completion", type: "tool.completed", actionId: "action" },
  ];
  const report = auditTrace(input);
  assert.deepEqual(report.findings, []);
});

test("duplicate trace event identifiers are rejected", async () => {
  const input = await trace("01-allowed-completion.json");
  input.events[1].id = input.events[0].id;
  assert.throws(() => auditTrace(input), /Trace validation failed/);
});
