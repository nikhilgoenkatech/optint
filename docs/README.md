# Calibrate Documentation

These documents explain how Calibrate interprets Davis problem data and turns repeated incidents into patterns that can be reviewed with customers.

## Customer-Facing Guides

- [Pattern Placement Guide](pattern-placement-guide.md) explains how recurring patterns appear in the Act-First Map and related workspace views.
- [Pattern Priority README](pattern-priority-readme.md) gives a small example dataset and shows how repeated incidents become ranked patterns.
- [DQL Validation Notebook](opint-dql-validation-notebook.md) lists validation queries that can be used to compare Calibrate output with tenant problem data.

## Important Notes

- Calibrate ranks recurring patterns, not individual alerts in isolation.
- Quadrant placement is based on observed signals such as recurrence, impact, affected users, affected entities, duration, RCA availability, evidence quality, and investigation readiness.
- Cost and recoverable value are modeled estimates based on configured assumptions and available Davis problem data.
- Dynatrace Assist recommendations are generated only after a user explicitly requests analysis or remediation.
