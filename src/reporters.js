import { RULE_CATALOG } from "./rule-catalog.js";

function mark(value) {
  return value ? "PASS" : "FAIL";
}

export function renderTerminal(report) {
  const lines = [
    `${report.result.toUpperCase()}  ${report.scenario.id}`,
    report.scenario.title,
    `Policy: ${report.policyId}`,
    `Actions: ${report.summary.actions} | allowed ${report.summary.allowed} | denied ${report.summary.denied} | findings ${report.summary.findings}`,
    "",
  ];

  for (const action of report.actions) {
    lines.push(
      `[${action.decision.toUpperCase()}] ${action.actionId}`,
      `  ${action.operation} ${action.resource}`,
      `  expectation: ${mark(action.matchedExpectation)} (${action.expectedDecision})`,
      `  policy rule: ${action.matchedPolicyRule ?? "default"}`,
    );
    for (const item of action.findings) {
      lines.push(`  ${item.ruleId} ${item.severity}: ${item.detail}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export function renderMarkdown(report) {
  const lines = [
    `# Evaluation: ${report.scenario.title}`,
    "",
    `**Result:** ${report.result.toUpperCase()}  `,
    `**Scenario:** \`${report.scenario.id}\`  `,
    `**Policy:** \`${report.policyId}\`  `,
    `**Evaluation time:** ${report.evaluatedAt}`,
    "",
    "## Summary",
    "",
    "| Actions | Allowed | Denied | Findings | Expectation mismatches |",
    "|---:|---:|---:|---:|---:|",
    `| ${report.summary.actions} | ${report.summary.allowed} | ${report.summary.denied} | ${report.summary.findings} | ${report.summary.expectationMismatches} |`,
    "",
    "## Action decisions",
    "",
  ];

  for (const action of report.actions) {
    lines.push(
      `### ${action.actionId}: ${action.decision.toUpperCase()}`,
      "",
      `- Requested: \`${action.operation}\` on \`${action.resource}\` using \`${action.capability}\`` ,
      `- Expected: \`${action.expectedDecision}\` (${mark(action.matchedExpectation)})`,
      `- Policy rule: \`${action.matchedPolicyRule ?? "default"}\``,
    );
    if (action.findings.length === 0) {
      lines.push("- Findings: none");
    } else {
      lines.push("", "| Rule | Severity | Finding |", "|---|---|---|");
      for (const item of action.findings) {
        lines.push(`| ${item.ruleId} | ${item.severity} | ${item.detail} |`);
      }
    }
    lines.push("");
  }

  lines.push(
    "## Interpretation",
    "",
    "A passing report means the computed decisions matched the scenario's declared expectations. It does not prove that a live agent, tool adapter, or external system is secure.",
    "",
  );
  return lines.join("\n");
}

export function renderJson(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

export function renderRuleCatalog() {
  const lines = ["Agentic Security Lab rules", ""];
  for (const [id, rule] of Object.entries(RULE_CATALOG)) {
    lines.push(`${id} [${rule.severity}] ${rule.title}`, `  ${rule.explanation}`, "");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export function renderSuiteTerminal(reports) {
  const passed = reports.filter(({ result }) => result === "pass").length;
  const lines = [`${passed === reports.length ? "PASS" : "FAIL"}  scenario suite`, ""];
  for (const report of reports) {
    lines.push(
      `${report.result.toUpperCase().padEnd(4)} ${report.scenario.id.padEnd(38)} ${report.summary.allowed} allow / ${report.summary.denied} deny`,
    );
  }
  lines.push("", `${passed}/${reports.length} scenarios passed`);
  return lines.join("\n") + "\n";
}
