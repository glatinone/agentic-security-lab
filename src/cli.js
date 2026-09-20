#!/usr/bin/env node
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { evaluateScenario } from "./engine.js";
import { CliError, InputError } from "./errors.js";
import {
  renderJson,
  renderMarkdown,
  renderRuleCatalog,
  renderSuiteTerminal,
  renderTerminal,
  renderTraceMarkdown,
  renderTraceSuiteTerminal,
  renderTraceTerminal,
} from "./reporters.js";
import { auditTrace } from "./trace-audit.js";

const HELP = `Agentic Security Lab

Evaluate proposed AI agent actions against explicit authority.

Usage:
  asl evaluate <scenario.json> [--policy <policy.json>] [--format terminal|json|markdown] [--out <file>]
  asl suite [scenario-directory] [--format terminal|json] [--out <file>]
  asl audit <trace.json> [--format terminal|json|markdown] [--out <file>]
  asl audit-suite [trace-directory] [--format terminal|json] [--out <file>]
  asl rules
  asl help

Exit codes:
  0  evaluation completed and expectations matched
  1  one or more computed decisions did not match expectations
  2  invalid arguments, files, or schemas
`;

const MAX_INPUT_BYTES = 1024 * 1024;

function parseOptions(args) {
  const positional = [];
  const options = { format: "terminal", policy: null, out: null };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    if (!["--format", "--policy", "--out"].includes(token)) {
      throw new CliError(`Unknown option: ${token}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new CliError(`${token} requires a value`);
    options[token.slice(2)] = value;
    index += 1;
  }
  return { positional, options };
}

async function readJson(filePath, label) {
  let source;
  try {
    const file = await stat(filePath);
    if (!file.isFile()) throw new Error("path is not a file");
    if (file.size > MAX_INPUT_BYTES) throw new Error(`file exceeds ${MAX_INPUT_BYTES} bytes`);
    source = await readFile(filePath, "utf8");
  } catch (error) {
    throw new CliError(`Cannot read ${label} file ${filePath}: ${error.message}`);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new CliError(`Invalid JSON in ${label} file ${filePath}: ${error.message}`);
  }
}

async function evaluateFile(scenarioPath, policyOverride) {
  const absoluteScenario = path.resolve(scenarioPath);
  const scenario = await readJson(absoluteScenario, "scenario");
  const policyPath = policyOverride
    ? path.resolve(policyOverride)
    : path.resolve(path.dirname(absoluteScenario), scenario.policy ?? "");
  const policy = await readJson(policyPath, "policy");
  return evaluateScenario(scenario, policy);
}

function render(report, format) {
  if (format === "terminal") return renderTerminal(report);
  if (format === "json") return renderJson(report);
  if (format === "markdown") return renderMarkdown(report);
  throw new CliError(`Unsupported format: ${format}`);
}

async function emit(content, destination) {
  if (!destination) {
    process.stdout.write(content);
    return;
  }
  await writeFile(path.resolve(destination), content, "utf8");
  process.stdout.write(`Wrote ${path.resolve(destination)}\n`);
}

async function runEvaluate(args) {
  const { positional, options } = parseOptions(args);
  if (positional.length !== 1) throw new CliError("evaluate requires one scenario file");
  const report = await evaluateFile(positional[0], options.policy);
  await emit(render(report, options.format), options.out);
  return report.result === "pass" ? 0 : 1;
}

async function runSuite(args) {
  const { positional, options } = parseOptions(args);
  if (positional.length > 1) throw new CliError("suite accepts at most one directory");
  if (options.policy) throw new CliError("suite reads each scenario's policy and does not accept --policy");
  if (!["terminal", "json"].includes(options.format)) {
    throw new CliError("suite supports terminal and json formats");
  }
  const directory = path.resolve(positional[0] ?? "scenarios");
  let names;
  try {
    names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  } catch (error) {
    throw new CliError(`Cannot read scenario directory ${directory}: ${error.message}`);
  }
  if (names.length === 0) throw new CliError(`No JSON scenarios found in ${directory}`);
  const reports = [];
  for (const name of names) reports.push(await evaluateFile(path.join(directory, name), null));
  const content = options.format === "json" ? renderJson(reports) : renderSuiteTerminal(reports);
  await emit(content, options.out);
  return reports.every(({ result }) => result === "pass") ? 0 : 1;
}

async function auditFile(tracePath) {
  return auditTrace(await readJson(path.resolve(tracePath), "trace"));
}

function renderTrace(report, format) {
  if (format === "terminal") return renderTraceTerminal(report);
  if (format === "json") return renderJson(report);
  if (format === "markdown") return renderTraceMarkdown(report);
  throw new CliError(`Unsupported format: ${format}`);
}

async function runAudit(args) {
  const { positional, options } = parseOptions(args);
  if (positional.length !== 1) throw new CliError("audit requires one trace file");
  if (options.policy) throw new CliError("audit does not accept --policy");
  const report = await auditFile(positional[0]);
  await emit(renderTrace(report, options.format), options.out);
  return report.result === "pass" ? 0 : 1;
}

async function runAuditSuite(args) {
  const { positional, options } = parseOptions(args);
  if (positional.length > 1) throw new CliError("audit-suite accepts at most one directory");
  if (options.policy) throw new CliError("audit-suite does not accept --policy");
  if (!["terminal", "json"].includes(options.format)) {
    throw new CliError("audit-suite supports terminal and json formats");
  }
  const directory = path.resolve(positional[0] ?? "traces");
  let names;
  try {
    names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  } catch (error) {
    throw new CliError(`Cannot read trace directory ${directory}: ${error.message}`);
  }
  if (names.length === 0) throw new CliError(`No JSON traces found in ${directory}`);
  const reports = [];
  for (const name of names) reports.push(await auditFile(path.join(directory, name)));
  const content = options.format === "json" ? renderJson(reports) : renderTraceSuiteTerminal(reports);
  await emit(content, options.out);
  return reports.every(({ result }) => result === "pass") ? 0 : 1;
}

export async function main(argv = process.argv.slice(2)) {
  const [command = "help", ...args] = argv;
  if (["help", "--help", "-h"].includes(command)) {
    process.stdout.write(HELP);
    return 0;
  }
  if (command === "rules") {
    process.stdout.write(renderRuleCatalog());
    return 0;
  }
  if (command === "evaluate") return runEvaluate(args);
  if (command === "suite") return runSuite(args);
  if (command === "audit") return runAudit(args);
  if (command === "audit-suite") return runAuditSuite(args);
  throw new CliError(`Unknown command: ${command}`);
}

const isEntryPoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      if (error instanceof InputError) {
        process.stderr.write(`${error.message}\n${error.details.map((detail) => `  - ${detail}`).join("\n")}\n`);
        process.exitCode = 2;
        return;
      }
      if (error instanceof CliError) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = error.exitCode;
        return;
      }
      process.stderr.write(`Unexpected error: ${error.message}\n`);
      process.exitCode = 2;
    },
  );
}
