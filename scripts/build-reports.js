import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateScenario } from "../src/engine.js";
import { renderJson, renderMarkdown } from "../src/reporters.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scenarioDirectory = path.join(root, "scenarios");
const reportDirectory = path.join(root, "reports");

await mkdir(reportDirectory, { recursive: true });
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
process.stdout.write(`Built ${reports.length} Markdown reports, ${reports.length} JSON reports, and suite.json\n`);
