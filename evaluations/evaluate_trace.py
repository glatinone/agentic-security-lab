"""Small stdlib-only validator for the lab's synthetic evaluation traces.

This is deliberately a fixture evaluator, not a production security engine.
It checks that every observed event matches the expected allow/deny sets and
that the trace declares whether secrets were present.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def evaluate(path: Path) -> tuple[bool, list[str]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    errors: list[str] = []
    events = payload.get("events", [])
    evaluation = payload.get("evaluation", {})
    expected = evaluation.get("expected", {})
    observed = evaluation.get("observed", {})

    event_ids = {event.get("event_id") for event in events}
    allowed = {event.get("event_id") for event in events if event.get("policy_decision") == "allow"}
    denied = {event.get("event_id") for event in events if event.get("policy_decision") == "deny"}

    if not event_ids or None in event_ids:
        errors.append("events must contain unique non-empty event_id values")
    if len(event_ids) != len(events):
        errors.append("event_id values must be unique")
    if allowed != set(expected.get("allowed_events", [])):
        errors.append("allowed event set does not match expected")
    if denied != set(expected.get("denied_events", [])):
        errors.append("denied event set does not match expected")
    if observed.get("allowed_events") != sorted(allowed):
        errors.append("observed allowed event set is inconsistent")
    if observed.get("denied_events") != sorted(denied):
        errors.append("observed denied event set is inconsistent")
    if observed.get("secrets_in_trace") is not False:
        errors.append("fixture must explicitly report secrets_in_trace=false")

    return not errors, errors


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("evaluations/fixtures/first-trace.json")
    ok, errors = evaluate(path)
    if ok:
        print(f"PASS {path}")
        return 0
    print(f"FAIL {path}")
    for error in errors:
        print(f"- {error}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
