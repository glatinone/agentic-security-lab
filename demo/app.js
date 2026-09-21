import { evaluateScenario } from "../src/engine.js";
import { DEMO_CASES } from "./data.js";

const elements = {
  list: document.querySelector("#case-list"),
  file: document.querySelector("#case-file"),
  title: document.querySelector("#scenario-title"),
  purpose: document.querySelector("#scenario-purpose"),
  editor: document.querySelector("#scenario-editor"),
  inputStatus: document.querySelector("#input-status"),
  policyId: document.querySelector("#policy-id"),
  result: document.querySelector("#result-state"),
  actions: document.querySelector("#action-count"),
  allowed: document.querySelector("#allowed-count"),
  findings: document.querySelector("#finding-count"),
  error: document.querySelector("#error-box"),
  empty: document.querySelector("#empty-state"),
  output: document.querySelector("#decision-output"),
  run: document.querySelector("#run-case"),
  reset: document.querySelector("#reset-case"),
};

let selectedIndex = 0;

function clear(element) {
  while (element.firstChild) element.firstChild.remove();
}

function text(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}

function resetSummary() {
  elements.result.textContent = "Not run";
  elements.result.className = "";
  elements.actions.textContent = "0";
  elements.allowed.textContent = "0";
  elements.findings.textContent = "0";
}

function selectCase(index) {
  selectedIndex = index;
  const item = DEMO_CASES[index];
  elements.file.textContent = item.file;
  elements.title.textContent = item.scenario.title;
  elements.purpose.textContent = item.scenario.purpose;
  elements.editor.value = JSON.stringify(item.scenario, null, 2);
  elements.inputStatus.textContent = "Curated fixture";
  elements.policyId.textContent = item.policy.id;
  elements.error.hidden = true;
  elements.empty.hidden = false;
  elements.output.hidden = true;
  clear(elements.output);
  resetSummary();
  [...elements.list.querySelectorAll("button")].forEach((button, buttonIndex) => {
    button.setAttribute("aria-current", buttonIndex === index ? "true" : "false");
  });
}

function renderAction(action) {
  const card = document.createElement("article");
  card.className = "action-card";

  const top = document.createElement("div");
  top.className = "action-top";
  const identity = document.createElement("div");
  identity.append(text("h4", action.actionId));
  identity.append(text("p", action.resource, "resource"));
  const verdict = text("span", action.decision.toUpperCase(), `verdict ${action.decision}`);
  top.append(identity, verdict);

  const meta = document.createElement("div");
  meta.className = "action-meta";
  meta.append(text("span", action.capability), text("span", action.operation));
  meta.append(text("span", `policy: ${action.matchedPolicyRule ?? "none"}`));
  meta.append(text("span", `expected: ${action.expectedDecision}`));

  card.append(top, meta);
  if (action.findings.length === 0) {
    card.append(text("div", "No control findings. The action has an allow path.", "clean"));
  } else {
    for (const finding of action.findings) {
      const block = document.createElement("div");
      block.className = "finding";
      block.append(text("div", `${finding.ruleId} · ${finding.severity}`, "finding-code"));
      block.append(text("h5", finding.title));
      block.append(text("p", finding.detail));
      card.append(block);
    }
  }
  return card;
}

function runCase() {
  elements.error.hidden = true;
  try {
    const scenario = JSON.parse(elements.editor.value);
    const report = evaluateScenario(scenario, DEMO_CASES[selectedIndex].policy);
    elements.result.textContent = report.result.toUpperCase();
    elements.result.className = report.result === "pass" ? "allow" : "deny";
    elements.actions.textContent = String(report.summary.actions);
    elements.allowed.textContent = String(report.summary.allowed);
    elements.findings.textContent = String(report.summary.findings);
    clear(elements.output);
    report.actions.forEach((action) => elements.output.append(renderAction(action)));
    elements.empty.hidden = true;
    elements.output.hidden = false;
    elements.inputStatus.textContent = "Evaluated locally";
  } catch (error) {
    elements.error.textContent = error.issues?.length
      ? `${error.message}\n${error.issues.map((issue) => `• ${issue}`).join("\n")}`
      : error.message;
    elements.error.hidden = false;
    elements.empty.hidden = true;
    elements.output.hidden = true;
    resetSummary();
  }
}

DEMO_CASES.forEach((item, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "case-button";
  button.append(text("span", String(index + 1).padStart(2, "0"), "case-number"));
  button.append(text("span", item.scenario.title, "case-name"));
  button.addEventListener("click", () => selectCase(index));
  elements.list.append(button);
});

elements.editor.addEventListener("input", () => { elements.inputStatus.textContent = "Edited fixture"; });
elements.run.addEventListener("click", runCase);
elements.reset.addEventListener("click", () => selectCase(selectedIndex));
selectCase(0);
