# Trace audit: Tool completion appears after a deny decision

- Result: **PASS**
- Trace: `denied-action-still-completes`

| Events | Decisions | Completions | Findings | Expectation matched |
|---:|---:|---:|---:|---:|
| 2 | 1 | 1 | 1 | yes |

## Findings

### ASL-201: Tool completed after a deny decision

- Severity: critical
- Action: `write-readme`
- Event: `completion-write` at position 1
- Evidence: Completion event completion-write followed deny event decision-write.

## Interpretation

A clean audit shows only that every recorded completion had a preceding allow decision. It cannot prove that the trace is complete or authentic.
