# Threat model

## Scope

Agentic Security Lab accepts a local scenario and policy, computes decisions for proposed actions, and renders a report. It does not execute an action or authenticate the data in the scenario.

The main security question is narrow: given the declared actor, provenance, approval, and policy, does the evaluator fail closed at the tool boundary?

## Assets

- The authority boundary expressed by policy rules
- Actor capability and tenant declarations
- Approval scope and expiry
- Action arguments that might contain credentials
- Report integrity and reproducibility
- Operator trust in an allow or deny result

## Trust boundaries

```text
scenario JSON ──┐
                ├── validation ── policy engine ── report
policy JSON ────┘                       │
                                       └── no action execution
```

The scenario and policy files are untrusted local input. Evidence marked `untrusted` remains data and cannot become authority. Approval and actor identity are assertions supplied by the caller, not authenticated facts.

## Abuse cases and controls

| ID | Abuse case | Implemented control | Residual risk |
|---|---|---|---|
| TM-01 | Retrieved text asks the agent to mutate a resource | Sensitive rules can block actions influenced by untrusted evidence | Provenance labels depend on the caller |
| TM-02 | A read-only actor proposes a write | Capability must be declared independently from policy matching | Actor identity is not authenticated |
| TM-03 | A broad allow rule crosses tenant ownership | Actor and resource tenant identifiers must match | Only the `tenant:<id>/...` convention is parsed |
| TM-04 | Old approval is reused | Approval expiry is checked against the scenario evaluation time | Approval signatures are not verified |
| TM-05 | Approval for one file is reused for another | Approval capability, operation, and resource must all match | Glob patterns can still be broad by operator choice |
| TM-06 | A token enters action arguments | Known secret shapes force a deny and values are omitted from reports | Heuristics cannot recognize every secret |
| TM-07 | An allow rule overlaps a deny rule | Explicit deny takes precedence | Confusing policies still need human review |
| TM-08 | Large input exhausts memory | The CLI limits each JSON input to 1 MiB | Direct library callers must impose their own limit |
| TM-09 | Expected output is edited to hide regression | Computed and expected decisions are reported separately | Repository write access can alter code and fixtures together |
| TM-10 | Traversal syntax escapes an allowed resource prefix | Resources are repeatedly decoded, canonicalized, and checked before matching | Non-path resource schemes may need scheme-specific validation |
| TM-11 | A tool completes after policy denied the action | Ordered trace audit links completion to the latest prior decision | The evaluator cannot prove trace completeness or authenticity |

## Security invariants

1. A policy allow does not grant a capability the actor did not declare.
2. A matching deny rule wins over matching allow rules.
3. Approval is bound to capability, operation, resource, and expiry.
4. Tenant mismatch forces a deny even if a resource rule matches.
5. A detected secret forces a deny and its value is not copied into the report.
6. Untrusted evidence cannot drive a sensitive action when the rule enables that control.
7. Unknown operations and malformed inputs fail before evaluation.
8. Non-canonical and traversal-bearing resources cannot reach policy matching.
9. Every recorded tool completion must follow an allow decision for the same action.

The tests exercise each invariant. See [`test/engine.test.js`](test/engine.test.js) and [`test/validation.test.js`](test/validation.test.js).

## Out of scope

- Live tool interception or sandboxing
- Authentication of agents, operators, tools, or approvals
- Policy distribution, signing, revocation, or storage
- Natural-language prompt-injection detection
- Complete data-loss prevention
- Tamper-evident audit storage
- Verification that a trace contains every runtime event
- Formal verification or compliance certification

## Safe use

Use synthetic or redacted scenarios. Do not copy production prompts, tokens, customer records, or raw incident traces into this repository. Treat allow results as test evidence, not permission to execute a real action.
