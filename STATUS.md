# Project status

- Version: 0.3.0
- Maturity: working evaluation lab
- Updated: 2026-09-20
- Owner: Kiell Tampubolon

## Verified

- The CLI evaluates one scenario or the complete scenario directory.
- Policies default to deny and explicit deny rules take precedence.
- Capability, resource, approval, provenance, tenant, and secret checks are implemented.
- Traversal, encoded traversal, ambiguous separators, and unsafe resource forms fail before policy matching.
- Trace audits detect completion after deny and completion without a prior decision.
- Raw action arguments are not copied into reports.
- Ten policy scenarios and four trace audits pass their declared expectations.
- Forty-seven automated tests pass on Node.js 24 locally. CI targets Node.js 20.
- The project has no runtime dependencies and makes no network calls.

## Next engineering work

- Publish JSON Schema documents for editor validation.
- Add signed approval and actor identity adapters without coupling them to the core engine.
- Add property tests for overlapping glob patterns and larger policy sets.
- Measure evaluation behavior on traces exported from a real agent runtime.

## Claims not made

The lab does not enforce policy for a live tool, authenticate actors, isolate execution, prove trace completeness, detect every credential format, or prove resistance to prompt injection. Production deployment and formal assurance remain out of scope.
