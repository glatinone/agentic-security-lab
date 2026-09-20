# Security policy

This repository evaluates synthetic action traces. It does not execute commands, call tools, open network connections, or enforce policy for a live agent.

## Reporting a problem

Open a GitHub security advisory for vulnerabilities that could expose local data, bypass input limits, leak action arguments into reports, or produce an incorrect allow decision. Do not include real credentials or customer traces in a report.

Ordinary rule requests, documentation corrections, and new scenario proposals can use public issues.

## Data handling

- The CLI reads local JSON files up to 1 MiB.
- Evaluation runs without network access or third-party packages.
- Raw action arguments are inspected in memory but are not copied into reports.
- Resource identifiers are canonicalized before policy matching. Traversal and ambiguous forms are denied.
- Trace audit order comes from the event array and is not cryptographically verified.
- Secret detection is heuristic. A clean report does not prove that the input contained no secret.
- Example tokens and identifiers in this repository are synthetic.

## Supported version

Only the current default branch is maintained during the prototype stage.
