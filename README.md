# Agentic Security Lab

[![verify](https://github.com/glatinone/agentic-security-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/glatinone/agentic-security-lab/actions/workflows/ci.yml)

**A deny-by-default policy boundary, enforced before an AI agent can call a tool.**

**[Open the live workbench](https://glatinone.github.io/agentic-security-lab/)**

![The browser workbench denying a repository write influenced by untrusted content](assets/screenshots/policy-workbench-deny.png)

*Real workbench output from scenario 03. The approved write scope exists, but untrusted repository text still cannot drive the mutation.*

Agent evaluations often grade the final answer. This lab examines a different failure boundary: what an agent tries to do with tools. It checks proposed actions against declared capabilities, resource scope, tenant ownership, approval records, data provenance, and a deny-by-default policy.

The result is decision evidence that can be read in a terminal, stored as JSON, or reviewed as a Markdown case file. A separate trace audit checks whether a tool completion violated that boundary. For live code, `enforceAndDispatch` puts the decision in front of the function call. A deny produces a receipt and zero tool invocations.

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

Open the local action-control workbench:

```bash
npm run demo:data
npm run demo:web
```

Then visit `http://127.0.0.1:4173/demo/`. Choose a curated case, edit its policy inputs, and evaluate it with the same engine used by the CLI and tests. The workbench stores nothing and makes no network calls.

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

Prove the execution boundary with a small support-agent adapter:

```bash
npm run example:support
```

The example reads a customer ticket, then handles a hostile instruction asking it to send a debug token. The read runs. The send does not. Its final output is `{"outboundMessages":0}`. See [the integration contract](docs/INTEGRATION.md).

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
- A production request contract with no scenario-only `expectedDecision` field
- An enforcement dispatcher that never calls a registered tool after deny
- Redacted receipts for blocked, completed, missing-adapter, and tool-error outcomes
- 18 executable policy cases, including positive controls and multi-action plans
- 57 tests covering allow paths, denial paths, dispatch count, redacted receipts, traversal, trace order, malformed input, CLI exit codes, matching, reporting, and expectation failure
- A browser workbench that imports the production evaluator instead of reimplementing decisions
- Architecture, decision semantics, ADRs, and an artifact provenance catalog

The scenario evaluator never executes a proposed action. Runtime integrations use `enforceAndDispatch`, which invokes only an explicitly registered capability after an allow decision.

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
| [Approval resource mismatch](scenarios/11-approval-resource-mismatch.json) | Exact approval resource scope | Deny |
| [Rejected approval](scenarios/12-rejected-approval.json) | Approval status | Deny |
| [Untrusted read-only discovery](scenarios/13-untrusted-read-only.json) | Sensitive versus read-only provenance control | Allow |
| [Explicit webhook deny](scenarios/14-explicit-webhook-deny.json) | Deny precedence over supplied approval | Deny |
| [Undeclared command execution](scenarios/15-undeclared-command.json) | Actor capability versus policy allowance | Deny |
| [Read then approved write](scenarios/16-read-then-approved-write.json) | Multi-action authority boundary | Allow |
| [Same-tenant record read](scenarios/17-same-tenant-read.json) | Tenant isolation positive control | Allow |
| [Ambiguous separator](scenarios/18-ambiguous-separator.json) | Filesystem and URL separator ambiguity | Deny |

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
src/             evaluator, enforcement boundary, validation, reporters, CLI
examples/        runnable tool-dispatch integration
policies/        explicit authority rules
scenarios/       reproducible allow and deny cases
traces/          ordered decision and completion fixtures
reports/         generated Markdown and JSON evidence
test/            unit and behavior tests
docs/FORMAT.md   input semantics and constraints
demo/            local browser action-control workbench
docs/adr/        accepted architecture decisions
PROJECT-PLAN.md  phased roadmap and exit criteria
THREAT-MODEL.md  assets, boundaries, abuse cases, limits
```

## How the repository is built

The project follows a phased plan rather than accumulating disconnected controls. Phase 0 defines the product and its boundaries. Phase 1 makes those claims inspectable through executable cases, generated reports, diagrams, and the browser workbench. Later phases cover portable schemas, runtime adapters, an adversarial benchmark, and release engineering.

- [Project plan and phase exit criteria](PROJECT-PLAN.md)
- [Architecture and trust boundaries](docs/ARCHITECTURE.md)
- [Deterministic decision model](docs/DECISION-MODEL.md)
- [Authored and generated artifact catalog](docs/ARTIFACTS.md)
- [Threat model](THREAT-MODEL.md)

## Design limits

This is not a sandbox, prompt-injection classifier, identity provider, or hosted authorization service. The in-process dispatcher is an enforcement point only for calls routed through it. It cannot stop code that bypasses the adapter, verify that a caller supplied truthful identity or provenance, or prove that a trace is complete. Secret detection is deliberately narrow and heuristic.

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
