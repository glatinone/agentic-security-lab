# Initial Threat Model

**Scope:** the first local evaluation slice: an agent proposes file and tool actions, a policy gate decides, and an audit trace records the decision.

**Status:** draft for prototype work. This is not a complete threat model for production deployments.

## Assets

- Repository contents and source code.
- Agent identity and declared capabilities.
- Policy rules and approval decisions.
- Secrets and credentials that must never enter an agent trace.
- Audit integrity, including the relationship between a request and its outcome.
- Operator attention and trust in the resulting report.

## Trust boundaries

1. User or upstream system to the agent.
2. Agent/model output to the tool adapter.
3. Tool adapter to the policy gate.
4. Policy gate to the filesystem, repository, or external service.
5. Runtime events to the audit sink and evaluation report.

The model is not a policy authority. Tool descriptions, retrieved content, repository files, and model-generated arguments are untrusted inputs.

## Initial abuse cases

| ID | Abuse case | Impact | First control to evaluate |
|---|---|---|---|
| TM-01 | Prompt injection asks the agent to ignore the user's scope | Unauthorized action or data access | Treat instructions from tool data as untrusted; require policy evaluation |
| TM-02 | Tool description disguises a write or exfiltration action as a read | Data loss or secret exposure | Capability allowlist and operation-level policy |
| TM-03 | Agent receives more filesystem/repository authority than the task needs | Blast-radius expansion | Least privilege, scoped resources, explicit deny by default |
| TM-04 | A denied action is not recorded or its reason is missing | Poor incident review and false confidence | Structured, tamper-evident audit events |
| TM-05 | Secrets or personal data are copied into a trace or fixture | Credential compromise or privacy harm | Redaction checks and synthetic fixtures |
| TM-06 | Evaluation only covers the happy path | Undetected control failure | Paired allow/deny scenarios and adversarial fixtures |

## Security assumptions

- The local fixture contains synthetic data only.
- The policy evaluator will be deterministic for a given input and policy version.
- A future runtime must authenticate tool identity separately from model text.
- Audit storage may be attacked; integrity and retention need a future design.
- This prototype does not claim to prevent every prompt-injection or tool-abuse path.

## Out of scope for this slice

- Live GitHub, cloud, browser, or production-system access.
- Active vulnerability testing or exploitation.
- Credential validation, storage, rotation, or recovery.
- Formal compliance, certification, or production-readiness claims.

## Evaluation questions

1. Does the gate distinguish a read from a write at the operation level?
2. Does it deny an action outside the declared resource scope?
3. Can an operator reconstruct the decision from the trace alone?
4. Are sensitive values excluded or redacted before persistence?
5. Are the same inputs stable across repeated runs?
