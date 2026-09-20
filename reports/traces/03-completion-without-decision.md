# Trace audit: Tool completion has no preceding policy decision

- Result: **PASS**
- Trace: `completion-without-policy-decision`

| Events | Decisions | Completions | Findings | Expectation matched |
|---:|---:|---:|---:|---:|
| 1 | 0 | 1 | 1 | yes |

## Findings

### ASL-202: Tool completed without a preceding policy decision

- Severity: critical
- Action: `send-report`
- Event: `completion-send` at position 0
- Evidence: Completion event completion-send has no preceding policy decision for action send-report.

## Interpretation

A clean audit shows only that every recorded completion had a preceding allow decision. It cannot prove that the trace is complete or authentic.
