# Agentic Security Lab

[![verify](https://github.com/glatinone/agentic-security-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/glatinone/agentic-security-lab/actions/workflows/ci.yml)

**A local policy evaluator and execution-trace auditor for AI agent actions.**

Agent evaluations often grade the final answer. This lab examines a different failure boundary: what an agent tries to do with tools. It checks proposed actions against declared capabilities, resource scope, tenant ownership, approval records, data provenance, and a deny-by-default policy.

The result is decision evidence that can be read in a terminal, stored as JSON, or reviewed as a Markdown case file. A separate trace audit checks whether a tool completion violated that decision boundary.

```text
proposed action
    │
    ├── declared capability?
    ├── resource and tenant in scope?
    ├── resource canonical and traversal-free?
    ├── matching allow or deny rule?
    ├── approval valid for this exact action?
    ├── influenced by untrusted content?
    └── secret-like material in arguments?
         │
         └── allow or deny, rule IDs, evidence
```

## Run it

Requirements: Node.js 20 or newer. There are no runtime dependencies and no network calls.

```bash
git clone https://github.com/glatinone/agentic-security-lab.git
cd agentic-security-lab
npm ci
npm run suite
```

Evaluate one case:

```bash
node src/cli.js evaluate scenarios/03-prompt-injection.json
```

```text
PASS  untrusted-content-cannot-trigger-write
Repository text tries to turn a review into a write
Policy: portfolio-agent-v1
Actions: 1 | allowed 0 | denied 1 | findings 1

[DENY] injection-driven-update
  update repository://glatinone/profile/README.md
  expectation: PASS (deny)
  policy rule: allow-approved-repository-write
  ASL-109 high: Sensitive action was influenced by untrusted evidence: readme-instruction.
```

Generate machine-readable or review-ready output:

```bash
node src/cli.js evaluate scenarios/05-secret-forwarding.json --format json
node src/cli.js evaluate scenarios/07-expired-approval.json --format markdown --out decision.md
node src/cli.js audit traces/02-completion-after-deny.json
node src/cli.js audit-suite traces
node src/cli.js rules
```

## What is implemented

- Deny-by-default policy evaluation with explicit deny precedence
- Capability, operation, and resource matching with `*` and `**` patterns
- Resource canonicalization with plain, encoded, and double-encoded traversal rejection
- Approval status, expiry, and exact scope checks
- Tenant-boundary enforcement for `tenant:<id>/...` resources
- Provenance checks that stop untrusted evidence from driving sensitive actions
- Secret-shape detection that reports categories without copying values into reports
- Stable evaluation time and deterministic output for reproducible cases
- Strict input validation, a 1 MiB input limit, and distinct CLI exit codes
- Terminal, JSON, and Markdown reports
- Trace-order auditing for completion after deny and completion without a prior decision
- 47 tests covering allow paths, denial paths, traversal, trace order, malformed input, CLI exit codes, matching, reporting, and expectation failure

The evaluator never executes the proposed action. It gives a tool adapter or reviewer a concrete policy decision and the reasons behind it.

## Scenario suite

| Case | Control under test | Expected result |
|---|---|---|
| [Scoped repository read](scenarios/01-scoped-read.json) | Declared read capability and resource scope | Allow |
| [Undeclared write](scenarios/02-undeclared-write.json) | Actor capability boundary | Deny |
| [Prompt injection influence](scenarios/03-prompt-injection.json) | Untrusted data provenance | Deny |
| [Approved scoped write](scenarios/04-approved-write.json) | Valid approval path | Allow |
| [Secret forwarding](scenarios/05-secret-forwarding.json) | Secret-like action arguments | Deny |
| [Cross-tenant read](scenarios/06-cross-tenant-read.json) | Tenant ownership boundary | Deny |
| [Expired approval](scenarios/07-expired-approval.json) | Time-bounded authority | Deny |
| [Path traversal](scenarios/08-path-traversal.json) | Canonical resource boundary | Deny |
| [Double-encoded traversal](scenarios/09-encoded-traversal.json) | Repeated decoding before matching | Deny |
| [Safe encoded filename](scenarios/10-canonical-encoded-resource.json) | Canonical matching without blanket rejection | Allow |

Each scenario states its expected result. The engine computes the decision independently. A suite failure means the computed decision no longer matches that expectation.

## Read the evidence

Generated reports are checked into [`reports/`](reports/) so the control behavior can be reviewed without running the code.

- [Prompt injection case file](reports/03-prompt-injection.md)
- [Secret forwarding case file](reports/05-secret-forwarding.md)
- [Complete JSON suite](reports/suite.json)
- [Completion after deny trace audit](reports/traces/02-completion-after-deny.md)
- [Complete trace audit suite](reports/traces/suite.json)

Raw action arguments are intentionally absent from reports. Findings carry rule IDs and limited metadata, not tokens or payload contents.

Trace events are evaluated in recorded order. A `tool.completed` event must have a preceding `policy.decision` event with `allow` for the same action. A later decision cannot retroactively authorize an earlier completion.

## Policy model

Policies are plain JSON. A rule selects capabilities, operations, and resources, then allows or denies a match. Allow rules can require approval or block sensitive actions influenced by untrusted evidence.

```json
{
  "id": "allow-approved-repository-write",
  "effect": "allow",
  "capabilities": ["repository.write"],
  "operations": ["create", "update", "delete"],
  "resources": ["repository://glatinone/**"],
  "requireApproval": true,
  "blockUntrustedInfluence": true
}
```

See [`docs/FORMAT.md`](docs/FORMAT.md) for the full input contract and [`policies/portfolio-agent-v1.json`](policies/portfolio-agent-v1.json) for a working policy.

## Repository map

```text
src/             evaluator, validation, reporters, CLI
policies/        explicit authority rules
scenarios/       reproducible allow and deny cases
traces/          ordered decision and completion fixtures
reports/         generated Markdown and JSON evidence
test/            unit and behavior tests
docs/FORMAT.md   input semantics and constraints
THREAT-MODEL.md  assets, boundaries, abuse cases, limits
```

## Design limits

This is a policy evaluation lab, not a sandbox, policy enforcement point, prompt-injection classifier, or production authorization service. It cannot verify that a caller supplied truthful identity, provenance, approval data, or a complete trace. Secret detection is deliberately narrow and heuristic.

A passing scenario means the engine behaved as the case expected. It is not a security certification for an agent or its tools.

See [`THREAT-MODEL.md`](THREAT-MODEL.md) for the boundary in detail.

## Related work

This project tests the control loop around tool use. Kiell's other projects cover adjacent layers:

- [`mcpscan`](https://github.com/glatinone/mcpscan) examines MCP server risk.
- [`secops-toolkit-mcp`](https://github.com/glatinone/secops-toolkit-mcp) exposes defensive investigation tools.
- [`agent-memory-protocol`](https://github.com/glatinone/agent-memory-protocol) explores state and lifecycle controls.

These links describe related public work. Agentic Security Lab does not claim runtime integration with them.

## License

[MIT](LICENSE)
