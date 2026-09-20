import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src/cli.js");

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8" });
}

test("CLI evaluates a passing scenario", () => {
  const result = run(["evaluate", "scenarios/01-scoped-read.json"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /PASS  scoped-repository-read/);
});

test("CLI returns exit code 1 for an expectation mismatch", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "asl-test-"));
  const source = JSON.parse(await readFile(path.join(root, "scenarios/01-scoped-read.json"), "utf8"));
  source.actions[0].expectedDecision = "deny";
  const scenarioPath = path.join(directory, "mismatch.json");
  await writeFile(scenarioPath, JSON.stringify(source), "utf8");
  const policyPath = path.join(root, "policies/portfolio-agent-v1.json");
  const result = run(["evaluate", scenarioPath, "--policy", policyPath]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /FAIL  scoped-repository-read/);
});

test("CLI returns exit code 2 for bad input", () => {
  const result = run(["evaluate", "scenarios/missing.json"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Cannot read scenario file/);
});

test("CLI exposes the stable rule catalog", () => {
  const result = run(["rules"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /ASL-109 \[high\] Untrusted content influenced a sensitive action/);
});

test("CLI audits one trace", () => {
  const result = run(["audit", "traces/02-completion-after-deny.json"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /ASL-201 critical/);
});

test("CLI audits the trace directory", () => {
  const result = run(["audit-suite", "traces"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /4\/4 traces matched expectations/);
});
