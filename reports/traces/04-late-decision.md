# Trace audit: An allow decision appears too late to authorize completion

- Result: **PASS**
- Trace: `decision-recorded-after-completion`

| Events | Decisions | Completions | Findings | Expectation matched |
|---:|---:|---:|---:|---:|
| 2 | 1 | 1 | 1 | yes |

## Findings

### ASL-202: Tool completed without a preceding policy decision

- Severity: critical
- Action: `delete-draft`
- Event: `completion-delete` at position 0
- Evidence: Completion event completion-delete has no preceding policy decision for action delete-draft.

## Interpretation

A clean audit shows only that every recorded completion had a preceding allow decision. It cannot prove that the trace is complete or authentic.
