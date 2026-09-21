# ADR 0001: deterministic data-in, data-out core

- Status: accepted
- Date: 2026-09-21

## Context

An action-policy lab must distinguish policy behavior from network availability, tool side effects, identity-provider state, and the wall clock. Mixing those concerns would make failures difficult to reproduce and would tempt the evaluator to claim enforcement it does not provide.

## Decision

The core accepts validated JavaScript data and returns a decision report. Evaluation time is supplied in the scenario. The core does not read files, contact services, execute tools, or obtain the current time.

File loading stays in the CLI. Tool dispatch stays in external runtime adapters. The browser workbench imports the same core modules.

## Consequences

- Cases are reproducible and run in Node.js or a browser.
- Tests can cover decisions without mocks for network or time.
- Callers remain responsible for identity, truthful provenance, approval verification, and enforcement.
- Future runtime integrations must adapt into the core contract instead of adding side effects to it.
