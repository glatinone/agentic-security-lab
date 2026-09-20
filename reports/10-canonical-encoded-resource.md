# Evaluation: A harmless encoded filename is canonicalized before matching

- Result: **PASS**
- Scenario: `safe-encoded-resource-canonicalized`
- Policy: `portfolio-agent-v1`
- Evaluation time: 2026-09-20T10:00:00.000Z

## Summary

| Actions | Allowed | Denied | Findings | Expectation mismatches |
|---:|---:|---:|---:|---:|
| 1 | 1 | 0 | 0 | 0 |

## Action decisions

### read-encoded-readme: ALLOW

- Requested: `read` on `repository://glatinone/%52EADME.md` using `repository.read`
- Expected: `allow` (PASS)
- Policy rule: `allow-repository-read`
- Canonical resource: `repository://glatinone/README.md`
- Findings: none

## Interpretation

A passing report means the computed decisions matched the scenario's declared expectations. It does not prove that a live agent, tool adapter, or external system is secure.
