# Artifact catalog

This catalog separates authored inputs, executable implementation, generated evidence, and future release artifacts. That distinction matters because checked-in reports are evidence derived from cases, not independent claims.

## Authored inputs

| Path | Artifact | Review question |
|---|---|---|
| `policies/*.json` | Authority rules | Is the permitted scope explicit and minimal? |
| `scenarios/*.json` | Proposed-action cases | Does the expected result represent the stated control? |
| `traces/*.json` | Recorded decision and completion order | Does the trace isolate one audit behavior? |
| `THREAT-MODEL.md` | Security boundary | Are trust assumptions and residual risks visible? |
| `docs/adr/*.md` | Architecture decisions | Is a consequential choice explained and reversible? |

## Executable artifacts

| Path | Artifact | Evidence of behavior |
|---|---|---|
| `src/` | Evaluator, trace auditor, reporters, and CLI | `test/`, scenario suite, trace suite |
| `demo/` | Browser workbench using the same evaluator | Manual browser flow and shared engine tests |
| `scripts/build-reports.js` | Evidence builder | Reproducible contents under `reports/` |
| `scripts/build-demo-data.js` | Curated workbench fixture builder | Generated `demo/data.js` |

## Generated evidence

| Path | Source | Rebuild command |
|---|---|---|
| `reports/*.md` | Policies and scenarios | `npm run reports` |
| `reports/*.json` | Policies and scenarios | `npm run reports` |
| `reports/traces/*` | Trace fixtures | `npm run reports` |
| `demo/data.js` | Curated policies and scenarios | `npm run demo:data` |

Generated evidence is committed so a reviewer can inspect decisions before running the project. It must not be hand-edited.

## Visual artifacts

| Path | Purpose |
|---|---|
| `docs/assets/project-cover.svg` | Repository identity and problem statement |
| `docs/assets/architecture.svg` | Component and trust-boundary map |
| `docs/assets/evaluation-flow.svg` | Fixed decision path |
| `docs/assets/workbench-deny.png` | Browser-captured proof of a live ASL-109 denial |

The SVG files are repo-native and editable as text. They use no remote fonts, images, or scripts. The workbench screenshot was captured from the local app after an actual evaluation, not assembled as a mockup.

## Release evidence contract

A release is expected to include:

- engine and report version;
- policy and scenario identifiers;
- deterministic evaluation time;
- action-level decisions and matched rule;
- stable finding identifiers;
- bounded evidence without raw action arguments;
- test, scenario, and trace suite results for the release commit.

Checksums, an SBOM, and signed provenance are Phase 5 deliverables. Their absence in the current lab is explicit.
