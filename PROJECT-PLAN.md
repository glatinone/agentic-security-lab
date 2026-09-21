# Project plan

Agentic Security Lab answers one narrow question: **did an agent stay inside the authority it was given when it used tools?**

The project is built as an evidence-producing lab, not a list of security prompts. Every control must have an executable case, a deterministic decision, and a report that another engineer can inspect without trusting a screenshot.

## Product promise

Given a declared actor, policy, evidence provenance, proposed actions, and an execution trace, the lab produces:

1. an allow or deny decision for each proposed action;
2. stable rule identifiers and bounded evidence for every denial;
3. a comparison against the case's expected result;
4. an audit of whether the recorded tool execution respected the decision.

The evaluator does not run tools, authenticate callers, or prove that a trace is complete. Those boundaries are part of the product, not footnotes.

## Requirement evidence

| Requirement | Implementation evidence | Verification evidence |
|---|---|---|
| Deny by default with explicit deny precedence | `src/engine.js`, `policies/portfolio-agent-v1.json` | `test/engine.test.js`, scenarios 02 and 14 |
| Canonical resources before policy matching | `src/matchers.js` | `test/matchers.test.js`, scenarios 08, 09, 10, and 18 |
| Exact, time-bounded approval scope | `src/engine.js` | scenarios 04, 07, 11, and 12 |
| Tenant isolation with a positive control | `src/engine.js` | scenarios 06 and 17 |
| Untrusted provenance cannot drive protected mutation | `src/engine.js` | scenarios 03 and 13 |
| Secret-like values are classified but not copied | `src/matchers.js`, `src/reporters.js` | `test/engine.test.js`, `test/reporters.test.js`, scenario 05 |
| Tool completion respects prior decisions | `src/trace-audit.js` | `test/trace-audit.test.js`, `traces/` |
| Reports are derived from versioned inputs | `scripts/build-reports.js` | `reports/`, CI report freshness check |
| Browser exploration uses the production evaluator | `demo/app.js` imports `src/engine.js` | `npm run demo:data`, local workbench smoke test |
| Claims and boundaries are inspectable | `docs/`, `THREAT-MODEL.md`, `PROJECT-PLAN.md` | Links from `README.md` and artifact catalog |

## Phase map

| Phase | Question answered | Exit criteria | Status |
|---|---|---|---|
| 0. Product contract | What is this lab, and what is it not? | Product promise, architecture, threat model, ADRs, artifact catalog, and release evidence contract agree with the code. | Complete |
| 1. Inspectable lab | Can a reviewer reproduce and understand the controls? | At least 15 policy cases, generated JSON and Markdown evidence, a browser workbench using the production evaluator, diagrams, and a green test and scenario suite. | Complete |
| 2. Portable contracts | Can other runtimes produce valid inputs safely? | Published JSON Schemas, schema fixtures, compatibility tests, signed approval adapter interface, and versioning rules. | Planned |
| 3. Runtime adapters | Can it stop an actual function call, then consume traces from a real agent runtime? | One policy enforcement integration, one read-only runtime adapter, replay fixtures with provenance, and documented trust assumptions. | In progress: generic enforcement complete |
| 4. Adversarial benchmark | How does control behavior change under attack variation? | Versioned benchmark corpus, mutation tests, coverage report by control, performance baseline, and false-positive review notes. | Planned |
| 5. Release candidate | Can another team adopt it without private context? | Reproducible release archive, SBOM, signed provenance, public demo, operator runbook, and an external review issue resolved or recorded. | Planned |

## Phase 0: product contract

### Deliverables

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): components, trust boundaries, and data flow
- [`docs/DECISION-MODEL.md`](docs/DECISION-MODEL.md): deterministic decision order and rule semantics
- [`docs/ARTIFACTS.md`](docs/ARTIFACTS.md): source, generated, and release artifacts
- [`docs/adr/`](docs/adr/): accepted architecture decisions
- [`THREAT-MODEL.md`](THREAT-MODEL.md): assets, adversaries, boundaries, and residual risks

### Exit test

- Every claim in the README points to code, a case, a test, or a generated report.
- Generated evidence is clearly marked and reproducible.
- The same evaluation engine powers the CLI, reports, tests, and browser workbench.
- No document implies enforcement, isolation, authentication, or complete prompt-injection detection.

## Phase 1: inspectable lab

### Deliverables

- A scenario corpus covering declared authority, explicit deny precedence, approval scope, approval lifetime, tenant isolation, provenance, secret-like material, canonical resources, and multi-action plans.
- Checked-in Markdown and JSON reports generated from the corpus.
- A local browser workbench for selecting, editing, and evaluating cases.
- Architecture and evaluation-flow diagrams stored as source-controlled SVG.
- CI gates for tests, scenario expectations, trace expectations, and report freshness.

### Exit test

Run:

```bash
npm ci
npm run verify
```

The command must pass the automated tests, all declared scenario expectations, all trace expectations, rebuild generated evidence, and fail if rebuilding leaves a tracked report changed.

## Phase 2: portable contracts

Work begins only after Phase 1 remains stable for at least one tagged release.

### Planned work

- JSON Schema documents for policy, scenario, trace, and report formats
- Golden invalid fixtures with exact validation failures
- Approval verifier interface with a fixture adapter, not a production identity claim
- Compatibility rules for additive and breaking schema changes
- A migration command for supported schema versions

### Exit test

An external producer can validate and submit an input without reading evaluator source code. Schema and runtime validation must reject the same invalid fixtures.

## Phase 3: runtime adapters

### Planned work

- Start with a read-only trace import from one documented agent runtime
- Preserve source event identifiers and record every normalization
- Extend the completed generic enforcement adapter with one runtime-specific integration
- Test missing, duplicate, reordered, and forged-looking events

### Completed evidence

- `src/enforcement.js` validates a production request without an `expectedDecision` field and refuses dispatch on deny.
- `test/enforcement.test.js` proves zero calls after deny, exactly one call after allow, fail-closed behavior for a missing adapter, and redacted error receipts.
- `examples/support-agent/run.js` exercises the boundary with an untrusted support ticket and reports zero outbound messages.
- `docs/INTEGRATION.md` documents the capability registry and receipt contract.

### Exit test

A recorded fixture can be replayed from raw export to normalized trace to policy decision to trace audit. The documentation states which facts are trusted and which are merely asserted by the exporter.

## Phase 4: adversarial benchmark

### Planned work

- Derive variations from each control instead of adding unrelated examples
- Mutate resource encoding, approval scope, time, provenance, and action order
- Publish control coverage and evaluation timing
- Record false-positive and false-negative candidates without hiding failures

### Exit test

Every benchmark result is reproducible from a versioned corpus and engine commit. Coverage is reported by control, not by a single vanity score.

## Phase 5: release candidate

### Planned work

- Release archive with checksums and software bill of materials
- Signed build provenance where the hosting platform supports it
- Operator runbook and integration checklist
- Public workbench deployment with a clear local-data notice
- One external review with findings resolved or accepted in writing

### Exit test

A new user can evaluate the supplied corpus, inspect the reports, and understand the product limits in under 15 minutes without private instructions.

## Change rule

New features must enter through this sequence: threat or user need, decision record, executable case, implementation, test, generated evidence, then documentation. A feature without an observable case is not complete.
