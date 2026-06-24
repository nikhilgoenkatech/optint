# OpInt Workspace Restored v1

This document summarizes the restored OpInt workspace baseline after the recovery/rebuild effort.

## What Was Restored

OpInt is back to a decision-workspace model across the three personas:

- Executive: prioritize recurring operational patterns by business impact and recoverable value.
- SRE: identify recurring reliability risks, automation candidates, and prevention opportunities.
- Developer: identify broken services or recurring issues, review scoped evidence, and invoke Assist only when needed.

Common restored behavior:

- Persistent right-side context panel for all personas.
- Selected Focus strip below the KPI row.
- One primary canvas at a time.
- Alternate explorer view per persona.
- Explicit analysis and remediation actions.
- True no-selection states for SRE and Developer.
- Right-panel empty states that guide the user instead of auto-selecting work.

## Persona Baselines

### Executive

Primary canvas:

- Act-First Map.

Alternate canvas:

- Pattern Explorer.

KPIs:

- Open Risk Exposure.
- Recoverable Now.
- Active Patterns.
- Median MTTR.

Right panel:

- Business Impact.
- Technical Actionability.
- Pattern Timeline.
- Recommended Action.
- Remediation Path after explicit request.

Workflow:

1. Select a recurring pattern from the Act-First Map or Pattern Explorer.
2. Review business impact and recurrence.
3. Review recommended action.
4. Click Get Remediation Path when ready.

### SRE

Primary canvas:

- Reliability Risk Matrix.

Alternate canvas:

- Operational Debt Explorer.

KPIs:

- Operational Debt.
- Automation Candidates.
- Repeat Offenders.
- Median MTTR.

Right panel:

- Details.
- Analysis.
- Remediation.

Workflow:

1. Select a reliability risk from the matrix or explorer.
2. Review reliability signals and operational debt drivers.
3. Generate analysis only when needed.
4. Generate remediation path only when ready.

SRE also includes a DQL reporting fallback so shorter timeframes can show raw DQL problem records even when no recurring pattern meets the JavaScript grouping threshold.

### Developer

Primary canvas:

- Service Heat Map.

Alternate canvas:

- Pattern Explorer.

KPIs:

- Open Errors.
- Services Impacted.
- Needs Investigation.
- Median Resolution Time.

Right panel:

- Details.
- Dynatrace Intelligence Analysis.
- Remediation Path.

Workflow:

1. Select a Developer Scope when useful.
2. Select a heat-map cell or Pattern Explorer row.
3. Review service, failure type, root-cause confidence, recurrence, trend, and impact summary.
4. Generate analysis or remediation only when needed.

## Major UX Decisions

- The right panel is the primary workflow surface. Drawers are secondary.
- No persona should auto-generate Dynatrace Assist output on selection.
- Executive does not expose a Generate Analysis workflow in the main experience.
- SRE uses reliability language: prevention, automation, operational debt, and recurrence.
- Developer uses service-oriented language: service, failure type, root-cause confidence, recurrence, and evidence.
- Raw numeric scoring is avoided in normal panels where plain labels are sufficient.
- Supporting evidence and impacted entities remain collapsed by default.
- No-selection states are intentional and should not immediately reselect the top item.

## Intentionally Removed Or Demoted Behavior

- Old one-off/report sections are not part of the active Developer workspace.
- Pattern cards and report-style sections are not the primary interaction model.
- Drawers are not required for the main analysis/remediation workflow.
- Executive analysis-heavy workflows are not shown by default.
- Formula-heavy explanations remain outside the normal decision flow.

## Future Phase 2 Items

The following items are intentionally deferred and should be added only after the restored workspace remains stable:

- DQL validation trust layer.
- Runtime Data Lineage mode.
- DQL-vs-JS reconciliation.
- Validation confidence.
- Query inventory panel.
- Cost model persistence.
- Full prompt/response lineage download.
- Deeper admin validation workflows.
- DQL-backed pattern recognition replacement.

## Checkpoint

Recommended checkpoint tag:

```powershell
git tag workspace-restored-v1
```

If sharing the checkpoint remotely:

```powershell
git push origin workspace-restored-v1
```
