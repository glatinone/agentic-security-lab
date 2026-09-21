# ADR 0003: scenarios are executable claims

- Status: accepted
- Date: 2026-09-21

## Context

A security repository can accumulate persuasive examples that no longer match the implementation. Screenshots and prose alone do not expose that drift.

## Decision

Every scenario action declares an expected decision. The evaluator computes its decision without reading that expectation, then reports whether the two match. The suite exits unsuccessfully on any mismatch. Markdown and JSON reports are generated from the same cases.

Scenario files must state one control purpose. Multi-action cases are allowed when the point is the boundary between permitted discovery and protected mutation.

## Consequences

- Public claims have executable examples.
- Changed policy behavior becomes a visible suite failure.
- Expectations still require human review. A green suite can faithfully preserve a bad expectation.
- Generated reports must be rebuilt and reviewed when cases, policies, or engine behavior change.
