import { finding } from "./rule-catalog.js";
import { validateTrace } from "./validation.js";

export function auditTrace(rawTrace) {
  const trace = validateTrace(rawTrace);
  const decisions = new Map();
  const findings = [];

  trace.events.forEach((event, eventIndex) => {
    if (event.type === "policy.decision") {
      decisions.set(event.actionId, {
        decision: event.decision,
        eventId: event.id,
        eventIndex,
      });
      return;
    }

    const priorDecision = decisions.get(event.actionId);
    if (!priorDecision) {
      findings.push({
        actionId: event.actionId,
        eventId: event.id,
        eventIndex,
        ...finding("ASL-202", `Completion event ${event.id} has no preceding policy decision for action ${event.actionId}.`),
      });
      return;
    }
    if (priorDecision.decision === "deny") {
      findings.push({
        actionId: event.actionId,
        eventId: event.id,
        eventIndex,
        ...finding("ASL-201", `Completion event ${event.id} followed deny event ${priorDecision.eventId}.`, {
          decisionEventId: priorDecision.eventId,
        }),
      });
    }
  });

  const actualFindingIds = findings.map(({ ruleId }) => ruleId).sort();
  const expectedFindingIds = [...trace.expectedFindings].sort();
  const matchedExpectation = JSON.stringify(actualFindingIds) === JSON.stringify(expectedFindingIds);

  return {
    reportVersion: "1.0",
    engineVersion: "0.3.0",
    trace: { id: trace.id, title: trace.title },
    result: matchedExpectation ? "pass" : "fail",
    summary: {
      events: trace.events.length,
      decisions: trace.events.filter(({ type }) => type === "policy.decision").length,
      completions: trace.events.filter(({ type }) => type === "tool.completed").length,
      findings: findings.length,
      matchedExpectation,
    },
    expectedFindings: expectedFindingIds,
    findings,
  };
}
