# Agentic Security Lab

> A small, reproducible lab for evaluating how AI agents use tools under identity, policy, and audit constraints.

**Status: early local prototype — not production-ready and not yet published.**

This repository is the narrative front door for Kiell Tampubolon's work across applied AI, cybersecurity, agent infrastructure, evaluation, and developer tooling. It is deliberately broader than one protocol or vendor: the lab focuses on the control loop around an agentic system.

## The first slice

```text
agent request
    -> identity and policy gate
    -> proposed tool action
    -> approval decision
    -> audit trace
    -> evaluation report
```

The first fixture models a benign request that is allowed to read a repository file while a write action is denied by policy. It is synthetic and contains no credentials or live-system access.

See [`evaluations/fixtures/first-trace.json`](evaluations/fixtures/first-trace.json) for the trace and [`THREAT-MODEL.md`](THREAT-MODEL.md) for the initial threat model.

## Why this exists

Agent systems need more than a capable model. They need bounded authority, observable decisions, reproducible failure cases, and a way to explain what happened after a tool call. This lab will connect those concerns to focused projects such as:

- [`mcpscan`](https://github.com/glatinone/mcpscan) for static risk detection;
- [`secops-toolkit-mcp`](https://github.com/glatinone/secops-toolkit-mcp) for defensive investigation workflows;
- [`agent-memory-protocol`](https://github.com/glatinone/agent-memory-protocol) for agent state and lifecycle controls.

Links are pointers to related public projects; this lab does not copy their source code.

## Evaluation vocabulary

Each scenario should record:

1. the actor and requested capability;
2. the resource and requested operation;
3. the policy decision and reason;
4. the resulting audit event;
5. expected versus observed outcome;
6. limitations and follow-up work.

The target is a useful engineering artifact, not a security certification or a claim of production safety.

## Planned next increments

- Add deterministic policy evaluation code with unit tests.
- Add adversarial fixtures for prompt injection, tool poisoning, excessive authority, and secret-handling failures.
- Produce a small machine-readable report and a human-readable case study for each scenario.
- Compare controls and failure modes across the related projects without claiming integration until it is actually implemented.

## Local verification

The current repository is documentation and fixture only. Validate the JSON fixture with any standards-compliant JSON parser:

```powershell
Get-Content evaluations/fixtures/first-trace.json -Raw | ConvertFrom-Json
```

No network, credentials, GitHub API, or live security testing is required for this first slice.

## Scope and safety

This lab is for defensive evaluation and documentation. It does not authorize access to systems, repositories, accounts, or data. Do not place secrets, personal data, production logs, or customer information in fixtures.

## License

License decision is pending before public publication.
