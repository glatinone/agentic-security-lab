# Input format

Agentic Security Lab evaluates two JSON documents: a policy and a scenario. Both use schema version `1.0`. The CLI rejects missing fields, duplicate identifiers, unsupported operations, unknown evidence references, and malformed approval scopes before policy evaluation starts.

## Policy

A policy is an ordered collection of allow and deny rules. Deny rules take precedence over allow rules. If no rule matches, `defaultDecision` applies.

```json
{
  "schemaVersion": "1.0",
  "id": "repository-agent-v1",
  "defaultDecision": "deny",
  "rules": [
    {
      "id": "approved-doc-update",
      "effect": "allow",
      "capabilities": ["repository.write"],
      "operations": ["update"],
      "resources": ["repository://owner/project/docs/**"],
      "requireApproval": true,
      "blockUntrustedInfluence": true
    }
  ]
}
```

Resource patterns support `*` for one path segment and `**` across segments. Pattern matching is case-sensitive.

## Scenario

A scenario names the policy file relative to the scenario file. `evaluatedAt` fixes time-dependent approval checks so repeated runs produce the same result.

```json
{
  "schemaVersion": "1.0",
  "id": "approved-doc-update",
  "title": "Update one approved document",
  "policy": "../policies/repository-agent-v1.json",
  "evaluatedAt": "2026-09-20T10:00:00.000Z",
  "actor": {
    "id": "documentation-agent",
    "declaredCapabilities": ["repository.write"]
  },
  "actions": [
    {
      "id": "update-runbook",
      "capability": "repository.write",
      "operation": "update",
      "resource": "repository://owner/project/docs/runbook.md",
      "arguments": { "patchDigest": "sha256:example" },
      "approval": {
        "id": "change-1842",
        "status": "approved",
        "expiresAt": "2026-09-20T11:00:00.000Z",
        "scope": {
          "capabilities": ["repository.write"],
          "operations": ["update"],
          "resources": ["repository://owner/project/docs/runbook.md"]
        }
      },
      "expectedDecision": "allow"
    }
  ]
}
```

`expectedDecision` is test evidence, not authority. The engine computes its own decision and fails the scenario when the two differ.

## Evidence and influence

Evidence can be marked `trusted` or `untrusted`. An action lists evidence identifiers in `influencedBy`. When a matching policy rule enables `blockUntrustedInfluence`, untrusted evidence cannot drive `create`, `update`, `delete`, `execute`, or `send` operations.

This is an explicit provenance check. The engine does not try to classify natural-language prompt injection.

## Operations

Version 1.0 accepts:

- `read`, `list`, and `search`
- `create`, `update`, and `delete`
- `execute`
- `send`

New operations require an engine and schema change. Unknown values fail validation.

## Reports

Reports include only action metadata, decisions, matched policy rules, and finding evidence. Raw action arguments are not copied into reports. The current secret scanner recognizes a small set of common credential shapes and reports only the detected category.
