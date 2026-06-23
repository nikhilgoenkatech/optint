# OpInt Workspace Rebuild Spec

This document captures the intended decision-workspace UX from the reference screenshots. The goal is to restore the workspace model carefully, one persona at a time, without broad rewrites or new concepts.

## Shared Workspace Principles

- The app should feel like a decision workspace, not a report dashboard.
- The main screen answers what to focus on next.
- The persistent right panel owns investigation context, analysis, and remediation.
- Drawers may remain available as secondary utilities, but they are not the primary workflow.
- Selecting a pattern, matrix bubble, heat-map cell, or table row updates the selected focus strip and the right panel.
- Analysis and remediation are invoked explicitly by the user and rendered in the workflow panel.

## Executive Workspace

Purpose: help leaders prioritize operational investment.

Primary question:

- Which recurring issue should we address first?

Layout:

- Top: compact KPI row.
- Below KPI row: selected pattern/focus strip.
- Main canvas: Act-First Map as the default view.
- Alternate canvas: Pattern Explorer toggle.
- Right side: persistent selected pattern investigation panel.

Right panel content:

- Business impact.
- Technical actionability.
- Recurrence context or timeline where reliable.
- Recommended action.
- Analysis section or tab.
- Remediation section or tab.
- Lower-level evidence collapsed by default.

Behavior:

- Act-First Map is the primary canvas.
- Pattern Explorer remains available as an alternate view.
- Selecting a bubble or row updates the focus strip, selected highlight, and right panel.
- The right panel remains visible and does not require opening a drawer.

## SRE Workspace

Purpose: help reliability owners prevent recurrence and identify automation opportunities.

Primary questions:

- Why does this keep happening?
- What should we automate?
- How do we prevent it from recurring?

Layout:

- Top: SRE KPI row.
- Below KPI row: selected focus strip.
- Main canvas: Reliability Risk Matrix as the default view.
- Alternate canvas: Operational Debt Explorer.
- Right side: persistent Reliability Context panel.

Right panel tabs:

- Details.
- Analysis.
- Remediation.

Details content:

- Reliability priority.
- Automation opportunity.
- RCA confidence.
- Blast radius score.
- Reliability signals.
- Automation opportunity explanation.
- Operational debt drivers.

Behavior:

- Selecting a risk bubble or explorer row updates the selected focus strip, matrix highlight, and right panel.
- Analysis is reliability-focused, not code-fix focused.
- Remediation emphasizes automation, ownership, guardrails, and recurrence prevention.

## Developer Workspace

Purpose: help developers answer what is broken, why it is broken, and where to fix it.

Primary questions:

- What is broken?
- Why is it broken?
- Where should I investigate first?
- What technical fix should I try?

Layout:

- Top: Developer KPI row.
- Below KPI row: Developer Scope control.
- Below scope: selected focus strip.
- Main canvas: Service Heat Map as the default view.
- Alternate canvas: Pattern Explorer.
- Right side: persistent Developer Context panel.

Right panel tabs:

- Details.
- Analysis.
- Remediation.

Details content:

- Affected service or entity.
- Failure type.
- Root cause status.
- Error or impact summary.
- Recurrence.
- Supporting evidence collapsed by default.
- Impacted entities collapsed by default.

Behavior:

- Developer Scope filters raw problems before pattern grouping.
- Selecting a service heat-map cell or pattern row updates the selected focus strip and right panel.
- Analysis and remediation are generated only after explicit user action.

## Persistent Right Panel

The right panel is the primary investigation surface.

It should:

- Stay visible after a pattern is selected.
- Preserve selected context when switching between map and explorer views.
- Contain Details, Analysis, and Remediation sections or tabs.
- Show loading states immediately below the action that triggered them.
- Scroll independently if content is long.
- Avoid exposing raw low-level evidence by default.

## Selected Focus Strip

The selected focus strip is a compact decision summary below the KPI row.

It should show:

- Selected pattern or service name.
- Key metric relevant to the persona.
- Recurrence or occurrence count.
- Open incident/problem count where applicable.
- Trend.
- Primary action or investigation direction.

When nothing is selected, it should explain how to begin.

## Workspace Canvas

Executive:

- Act-First Map default.
- Pattern Explorer alternate.

SRE:

- Reliability Risk Matrix default.
- Operational Debt Explorer alternate.

Developer:

- Service Heat Map default.
- Pattern Explorer alternate.

Only one analytical view should be visible at a time.

## Analysis And Remediation

Analysis and remediation should be embedded in the right panel.

Expected behavior:

- User explicitly clicks Generate Analysis or Get Remediation Path.
- The panel shows a loading state immediately.
- Results render in the panel.
- Drawers remain secondary and should not be required for the main workflow.

## Rebuild Guardrails

- Do not rewrite `ui/app.js` wholesale.
- Do not restore every missing feature at once.
- Do not modify SRE or Developer when restoring Executive.
- Do not introduce a new data model unless optional display-only fields are required.
- Prefer reconnecting existing helpers over duplicating logic.
- Run typecheck and build after each batch.
