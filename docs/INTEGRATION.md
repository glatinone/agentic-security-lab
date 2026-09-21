# Put the boundary in front of the tool

`evaluateScenario` is for regression fixtures. Runtime code should call `enforceAndDispatch` instead. The dispatcher validates the production request, evaluates policy, and calls a registered tool only after an allow decision.

```js
import { enforceAndDispatch } from "../src/enforcement.js";

const outcome = await enforceAndDispatch({
  policy,
  request: {
    attemptId: "support-2026-09-21-0042",
    evaluatedAt: new Date().toISOString(),
    actor: { id: "support-copilot", declaredCapabilities: ["ticket.read"] },
    evidence: [],
    action: {
      id: "read-ticket",
      capability: "ticket.read",
      operation: "read",
      resource: "ticket://acme/42",
      arguments: { fields: ["subject", "body"] }
    }
  },
  tools: {
    "ticket.read": async (arguments_, context) => ticketApi.read(context.resource, arguments_)
  }
});
```

The tool registry is an explicit capability map. A missing adapter fails closed. A deny returns a redacted receipt and never calls the function. A tool error throws `ToolExecutionError` with a receipt that records the attempt without copying arguments, results, or error messages.

Run the complete support-agent example:

```bash
npm run example:support
```

The final line reports `{"outboundMessages":0}`. That assertion matters more than a policy screenshot: it proves that the hostile ticket text did not cross the execution boundary.
