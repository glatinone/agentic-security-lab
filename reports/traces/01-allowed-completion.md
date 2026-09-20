# Trace audit: Tool completion follows an allow decision

- Result: **PASS**
- Trace: `allowed-action-completes`

| Events | Decisions | Completions | Findings | Expectation matched |
|---:|---:|---:|---:|---:|
| 2 | 1 | 1 | 0 | yes |

## Findings

No trace-order violations found.

## Interpretation

A clean audit shows only that every recorded completion had a preceding allow decision. It cannot prove that the trace is complete or authentic.
