import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateScenario } from "../src/engine.js";
import { renderJson, renderMarkdown, renderTraceMarkdown } from "../src/reporters.js";
import { auditTrace } from "../src/trace-audit.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scenarioDirectory = path.join(root, "scenarios");
const reportDirectory = path.join(root, "reports");
const traceDirectory = path.join(root, "traces");
const traceReportDirectory = path.join(reportDirectory, "traces");

await mkdir(reportDirectory, { recursive: true });
await mkdir(traceReportDirectory, { recursive: true });
const names = (await readdir(scenarioDirectory)).filter((name) => name.endsWith(".json")).sort();
const reports = [];

for (const name of names) {
  const scenarioPath = path.join(scenarioDirectory, name);
  const scenario = JSON.parse(await readFile(scenarioPath, "utf8"));
  const policyPath = path.resolve(scenarioDirectory, scenario.policy);
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  const report = evaluateScenario(scenario, policy);
  const stem = path.basename(name, ".json");
  await writeFile(path.join(reportDirectory, `${stem}.md`), renderMarkdown(report), "utf8");
  await writeFile(path.join(reportDirectory, `${stem}.json`), renderJson(report), "utf8");
  reports.push(report);
}

await writeFile(path.join(reportDirectory, "suite.json"), renderJson(reports), "utf8");

const traceNames = (await readdir(traceDirectory)).filter((name) => name.endsWith(".json")).sort();
const traceReports = [];
for (const name of traceNames) {
  const trace = JSON.parse(await readFile(path.join(traceDirectory, name), "utf8"));
  const report = auditTrace(trace);
  const stem = path.basename(name, ".json");
  await writeFile(path.join(traceReportDirectory, `${stem}.md`), renderTraceMarkdown(report), "utf8");
  await writeFile(path.join(traceReportDirectory, `${stem}.json`), renderJson(report), "utf8");
  traceReports.push(report);
}
await writeFile(path.join(traceReportDirectory, "suite.json"), renderJson(traceReports), "utf8");

process.stdout.write(
  `Built ${reports.length} scenario reports and ${traceReports.length} trace audit reports in Markdown and JSON\n`,
);
