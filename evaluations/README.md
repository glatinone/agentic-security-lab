# Evaluations

The first lab slice uses deterministic JSON traces so a visitor can inspect both the scenario and the decision evidence without credentials or network access.

Run the local validator from this directory:

```powershell
python .\evaluate_trace.py .\fixtures\first-trace.json
python .\evaluate_trace.py .\fixtures\prompt-injection-deny.json
```

The fixtures demonstrate:

- an allowed read under an explicit capability;
- a denied write under default-deny policy;
- untrusted content that cannot expand authority;
- explicit secret absence and limitations.

This is an educational and portfolio proof slice, not a penetration test or production policy engine.
