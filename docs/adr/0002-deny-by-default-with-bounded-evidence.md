# ADR 0002: deny by default with bounded evidence

- Status: accepted
- Date: 2026-09-21

## Context

Agent actions can contain credentials, personal data, or attacker-controlled payloads. A useful denial report must explain the control failure without turning the report directory into a second data leak.

## Decision

The reference policy denies unmatched actions. Explicit deny rules take precedence over allow rules. Any control finding denies the action.

Reports include action identity, capability, operation, resource, decision, stable rule identifiers, and selected evidence metadata. They do not include raw action arguments. Secret detection reports the detected category, not the matched value.

## Consequences

- Missing policy coverage fails closed.
- Reviewers can trace decisions to stable rules.
- Reports remain sensitive because resources and approval scope can reveal structure, but they avoid copying payloads and tokens.
- The evaluator may deny benign inputs that resemble supported secret shapes. That tradeoff is documented and tested.
